import express, { Request, Response } from 'express';
import dbService from './db';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  generateNumericOTP,
  hashOTP,
  verifyOTP,
  verifyRecoveryKey,
} from './auth';
import { sendWhatsAppInvoiceNotification } from './whatsapp';
import { sendSmsText, isSmsConfigured } from './sms';

// Only ever expose the raw OTP value in the API response when NOT running in
// production. In production, the OTP must reach the user exclusively via
// WhatsApp — never via the HTTP response body or the browser UI.
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
import {
  Product,
  Category,
  Order,
  Invoice,
  Payment,
  StockTransaction,
  User,
  OTPVerification,
  PaymentMode,
  OrderSource,
} from './types';

export const apiRouter = express.Router();

// -------------------------------------------------------------
// DURABLE STORAGE MIDDLEWARE (fixes "download link only works once")
// -------------------------------------------------------------
// 1. Before handling anything, pull the latest durable snapshot from KV
//    (if configured) so a cold-started function isn't operating on stale
//    seed data.
// 2. Before sending ANY response, wait for the current request's database
//    write (if it made one) to actually finish reaching KV — otherwise
//    Vercel can freeze the function right after res.json() returns and a
//    fire-and-forget write could get silently dropped, which is exactly
//    what caused invoices/orders to vanish after the function went cold.
apiRouter.use((req, res, next) => {
  dbService.ensureLoaded().then(() => next()).catch(next);
});

apiRouter.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = ((body?: any) => {
    dbService
      .flushPending()
      .catch(() => {})
      .finally(() => originalJson(body));
    return res;
  }) as typeof res.json;
  next();
});

// Wraps an async route handler so thrown/rejected errors are forwarded to
// Express's error middleware instead of crashing the serverless function
// or hanging the request with no response.
function asyncHandler(fn: (req: Request, res: Response) => Promise<any>) {
  return (req: Request, res: Response, next: (err?: any) => void) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

// Middleware: Extract user from Authorization token
export function authMiddleware(req: Request, res: Response, next: () => void) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = header.substring(7);
  const session = verifySessionToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid token' });
  }
  (req as any).user = session;
  next();
}

// Middleware: Require OWNER role
export function ownerOnlyMiddleware(req: Request, res: Response, next: () => void) {
  authMiddleware(req, res, () => {
    const user = (req as any).user;
    if (user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Access denied: Owner privileges required' });
    }
    next();
  });
}

// Optional Auth (for routes that might be accessed with or without login)
export function optionalAuthMiddleware(req: Request, res: Response, next: () => void) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const session = verifySessionToken(header.substring(7));
    if (session) {
      (req as any).user = session;
    }
  }
  next();
}

// -------------------------------------------------------------
// AUTHENTICATION ROUTES
// -------------------------------------------------------------
apiRouter.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const cleanUser = username.trim().toLowerCase();
  const db = dbService.getData();
  const user = db.users.find(
    (u) =>
      u.username.toLowerCase() === cleanUser ||
      u.email.toLowerCase() === cleanUser ||
      (cleanUser === 'admin' && u.role === 'OWNER') ||
      ((cleanUser === '8870929100' || cleanUser === '9444415380' || cleanUser === 'gopinath' || cleanUser === 'devaraj') && u.role === 'OWNER') ||
      u.mobile.replace(/\D/g, '') === cleanUser.replace(/\D/g, '')
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  if (user.status === 'DISABLED') {
    return res.status(403).json({ error: 'Account disabled. Please contact the store owner.' });
  }

  const isValid = verifyPassword(password, user.salt, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Update last login
  user.last_login = new Date().toISOString();
  dbService.saveSync();

  dbService.logActivity(
    user.name,
    'USER_LOGIN',
    `User ${user.username} (${user.role}) logged in successfully`,
    user.id,
    user.username,
    req.ip
  );

  const token = createSessionToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      mobile: user.mobile,
      last_login: user.last_login,
    },
  });
});

apiRouter.get('/auth/me', authMiddleware, (req, res) => {
  const sessionUser = (req as any).user;
  const db = dbService.getData();
  const user = db.users.find((u) => u.id === sessionUser.id);
  if (!user || user.status === 'DISABLED') {
    return res.status(401).json({ error: 'User no longer active' });
  }
  res.json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      mobile: user.mobile,
      last_login: user.last_login,
    },
  });
});

apiRouter.post('/auth/logout', authMiddleware, (req, res) => {
  const user = (req as any).user;
  dbService.logActivity(user.name, 'USER_LOGOUT', `User ${user.username} logged out`, user.id);
  res.json({ success: true, message: 'Logged out successfully' });
});

// -------------------------------------------------------------
// FORGOT PASSWORD FLOW (PUBLIC / OWNER & STAFF)
// -------------------------------------------------------------
apiRouter.post('/auth/forgot-password/request-otp', asyncHandler(async (req, res) => {
  const { identifier } = req.body;
  if (!identifier || !identifier.toString().trim()) {
    return res.status(400).json({ error: 'Username or registered mobile number is required' });
  }

  const cleanIdent = identifier.toString().trim().toLowerCase();
  const db = dbService.getData();

  const dbUser = db.users.find(
    (u) =>
      u.username.toLowerCase() === cleanIdent ||
      u.email.toLowerCase() === cleanIdent ||
      (cleanIdent === 'admin' && u.role === 'OWNER') ||
      ((cleanIdent === '8870929100' || cleanIdent === '9444415380' || cleanIdent === 'gopinath' || cleanIdent === 'devaraj') && u.role === 'OWNER') ||
      u.mobile.replace(/\D/g, '') === cleanIdent.replace(/\D/g, '')
  );

  if (!dbUser) {
    return res.status(404).json({
      error: 'No account found matching this username or registered mobile number.',
    });
  }

  if (dbUser.status === 'DISABLED') {
    return res.status(403).json({ error: 'This account is currently disabled. Please contact the administrator.' });
  }

  const otp = generateNumericOTP();
  const otpHash = hashOTP(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes validity

  // Mark previous unused OTPs as used
  db.otp_verifications.forEach((o) => {
    if (o.user_id === dbUser.id && o.purpose === 'FORGOT_PASSWORD') {
      o.is_used = true;
    }
  });

  const otpId = db.otp_verifications.length > 0 ? Math.max(...db.otp_verifications.map((o) => o.id)) + 1 : 1;
  const record: OTPVerification = {
    id: otpId,
    user_id: dbUser.id,
    mobile: dbUser.mobile,
    otp_hash: otpHash,
    plain_otp_for_dev: otp,
    purpose: 'FORGOT_PASSWORD',
    attempts: 0,
    max_attempts: 5,
    expires_at: expiresAt,
    is_used: false,
    created_at: new Date().toISOString(),
  };

  db.otp_verifications.unshift(record);
  dbService.saveSync();

  // Mask mobile number for privacy (e.g. 98947***76)
  const mob = dbUser.mobile || '';
  const maskedMobile =
    mob.length >= 7 ? `${mob.slice(0, 5)}***${mob.slice(-2)}` : mob;

  dbService.logActivity(
    dbUser.name,
    'FORGOT_PWD_OTP_SENT',
    `Password reset OTP generated for ${dbUser.username} (${dbUser.role}) to mobile ${dbUser.mobile}`,
    dbUser.id
  );

  // Deliver the OTP via SMS (not WhatsApp — avoids needing a Meta WhatsApp
  // Business number, which is useful when the shop's real number is
  // already registered to a different WhatsApp Business account).
  // If no SMS provider is configured, we deliberately do NOT leak the OTP
  // back to the browser in production — see IS_PRODUCTION below.
  let smsDeliveryFailed = false;
  if (isSmsConfigured()) {
    const smsResult = await sendSmsText(
      dbUser.mobile,
      `Your Devaraj Crackers verification code is ${otp}. Valid for 10 minutes. Do not share this code with anyone.`
    );
    smsDeliveryFailed = !smsResult.success;
  }

  res.json({
    success: true,
    message: isSmsConfigured()
      ? `Security OTP sent via SMS to registered mobile (${maskedMobile}). Valid for 10 minutes.`
      : `SMS delivery is not configured on this server yet, so the OTP could not be sent. Please contact the site administrator.`,
    maskedMobile,
    username: dbUser.username,
    name: dbUser.name,
    role: dbUser.role,
    expires_at: expiresAt,
    sms_configured: isSmsConfigured(),
    sms_delivery_failed: smsDeliveryFailed,
    // SECURITY: only ever included outside production, for local testing.
    ...(IS_PRODUCTION ? {} : { otp_for_dev: otp }),
  });
}));

apiRouter.post('/auth/forgot-password/verify-and-reset', (req, res) => {
  const { identifier, otp, new_password } = req.body;

  if (!identifier) {
    return res.status(400).json({ error: 'Username or registered mobile is required' });
  }
  if (!otp) {
    return res.status(400).json({ error: '6-digit OTP is required' });
  }
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  const cleanIdent = identifier.toString().trim().toLowerCase();
  const db = dbService.getData();

  const dbUser = db.users.find(
    (u) =>
      u.username.toLowerCase() === cleanIdent ||
      u.email.toLowerCase() === cleanIdent ||
      (cleanIdent === 'admin' && u.role === 'OWNER') ||
      ((cleanIdent === '8870929100' || cleanIdent === '9444415380' || cleanIdent === 'gopinath' || cleanIdent === 'devaraj') && u.role === 'OWNER') ||
      u.mobile.replace(/\D/g, '') === cleanIdent.replace(/\D/g, '')
  );

  if (!dbUser) {
    return res.status(404).json({ error: 'User account not found' });
  }

  const otpRecord = db.otp_verifications.find(
    (o) => o.user_id === dbUser.id && o.purpose === 'FORGOT_PASSWORD' && !o.is_used
  );

  if (!otpRecord) {
    return res.status(400).json({
      error: 'No active OTP request found. Please click "Request OTP" again.',
    });
  }

  if (new Date(otpRecord.expires_at).getTime() < Date.now()) {
    return res.status(400).json({
      error: 'OTP has expired (10 minutes limit). Please request a new OTP.',
    });
  }

  if (otpRecord.attempts >= otpRecord.max_attempts) {
    return res.status(400).json({
      error: 'Maximum verification attempts exceeded. Please request a new OTP.',
    });
  }

  otpRecord.attempts += 1;

  if (!verifyOTP(otp.toString().trim(), otpRecord.otp_hash)) {
    dbService.saveSync();
    const remaining = otpRecord.max_attempts - otpRecord.attempts;
    return res.status(400).json({ error: `Invalid OTP. ${remaining} attempts remaining.` });
  }

  // OTP verified successfully
  otpRecord.is_used = true;

  // Update password
  const newAuth = hashPassword(new_password);
  dbUser.password_hash = newAuth.hash;
  dbUser.salt = newAuth.salt;
  dbUser.updated_at = new Date().toISOString();
  dbUser.last_login = new Date().toISOString();

  dbService.saveSync();

  dbService.logActivity(
    dbUser.name,
    'PASSWORD_RESET_SUCCESS',
    `User ${dbUser.username} (${dbUser.role}) successfully reset password via OTP verification`,
    dbUser.id
  );

  // Generate session token so owner/staff is immediately logged in
  const token = createSessionToken(dbUser);

  res.json({
    success: true,
    message: 'Password reset successfully! You are now logged in.',
    token,
    user: {
      id: dbUser.id,
      name: dbUser.name,
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.role,
      mobile: dbUser.mobile,
      last_login: dbUser.last_login,
    },
  });
});

// -------------------------------------------------------------
// RECOVERY KEY PASSWORD RESET (no SMS / MSG91 / WhatsApp needed)
// -------------------------------------------------------------
// A one-step alternative to the OTP flow above, for when no SMS provider
// is configured. Instead of an OTP texted to a phone, the admin proves
// they're authorized by supplying the ADMIN_RECOVERY_KEY secret (set in
// Vercel env vars, defaults to a built-in phrase — see server/auth.ts).
apiRouter.post('/auth/forgot-password/recovery-key-reset', (req, res) => {
  const { identifier, recovery_key, new_password } = req.body;

  if (!identifier || !identifier.toString().trim()) {
    return res.status(400).json({ error: 'Username or registered mobile number is required' });
  }
  if (!recovery_key || !recovery_key.toString().trim()) {
    return res.status(400).json({ error: 'Recovery key is required' });
  }
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  if (!verifyRecoveryKey(recovery_key.toString())) {
    return res.status(401).json({ error: 'Incorrect recovery key. Please check the key and try again.' });
  }

  const cleanIdent = identifier.toString().trim().toLowerCase();
  const db = dbService.getData();

  const dbUser = db.users.find(
    (u) =>
      u.username.toLowerCase() === cleanIdent ||
      u.email.toLowerCase() === cleanIdent ||
      (cleanIdent === 'admin' && u.role === 'OWNER') ||
      ((cleanIdent === '8870929100' || cleanIdent === '9444415380' || cleanIdent === 'gopinath' || cleanIdent === 'devaraj') && u.role === 'OWNER') ||
      u.mobile.replace(/\D/g, '') === cleanIdent.replace(/\D/g, '')
  );

  if (!dbUser) {
    return res.status(404).json({ error: 'User account not found' });
  }

  if (dbUser.status === 'DISABLED') {
    return res.status(403).json({ error: 'This account is currently disabled. Please contact the administrator.' });
  }

  const newAuth = hashPassword(new_password);
  dbUser.password_hash = newAuth.hash;
  dbUser.salt = newAuth.salt;
  dbUser.updated_at = new Date().toISOString();
  dbUser.last_login = new Date().toISOString();

  dbService.saveSync();

  dbService.logActivity(
    dbUser.name,
    'PASSWORD_RESET_SUCCESS',
    `User ${dbUser.username} (${dbUser.role}) reset password using the Admin Recovery Key (no SMS/OTP involved)`,
    dbUser.id
  );

  const token = createSessionToken(dbUser);

  res.json({
    success: true,
    message: 'Password reset successfully using the Recovery Key! You are now logged in.',
    token,
    user: {
      id: dbUser.id,
      name: dbUser.name,
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.role,
      mobile: dbUser.mobile,
      last_login: dbUser.last_login,
    },
  });
});

// -------------------------------------------------------------
// OTP PASSWORD CHANGE FLOW (Section 33)
// -------------------------------------------------------------
apiRouter.post('/auth/send-otp', authMiddleware, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const db = dbService.getData();
  const dbUser = db.users.find((u) => u.id === user.id);
  if (!dbUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const otp = generateNumericOTP();
  const otpHash = hashOTP(otp);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes expiration

  const otpId = db.otp_verifications.length > 0 ? Math.max(...db.otp_verifications.map((o) => o.id)) + 1 : 1;
  const record: OTPVerification = {
    id: otpId,
    user_id: dbUser.id,
    mobile: dbUser.mobile,
    otp_hash: otpHash,
    plain_otp_for_dev: otp, // For ease of demonstration in development
    purpose: 'PASSWORD_CHANGE',
    attempts: 0,
    max_attempts: 3,
    expires_at: expiresAt,
    is_used: false,
    created_at: new Date().toISOString(),
  };

  db.otp_verifications.unshift(record);
  dbService.saveSync();

  dbService.logActivity(
    dbUser.name,
    'OTP_GENERATED',
    `OTP sent for password change to mobile ${dbUser.mobile}`,
    dbUser.id
  );

  let smsDeliveryFailed = false;
  if (isSmsConfigured()) {
    const smsResult = await sendSmsText(
      dbUser.mobile,
      `Your Devaraj Crackers verification code is ${otp}. Valid for 5 minutes. Do not share this code with anyone.`
    );
    smsDeliveryFailed = !smsResult.success;
  }

  res.json({
    success: true,
    message: isSmsConfigured()
      ? `Security OTP sent via SMS to ${dbUser.mobile}. Valid for 5 minutes.`
      : `SMS delivery is not configured on this server yet, so the OTP could not be sent. Please contact the site administrator.`,
    expires_at: expiresAt,
    sms_configured: isSmsConfigured(),
    sms_delivery_failed: smsDeliveryFailed,
    // SECURITY: only ever included outside production, for local testing.
    ...(IS_PRODUCTION ? {} : { otp_for_dev: otp }),
  });
}));

apiRouter.post('/auth/change-password-with-otp', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const { new_password, otp } = req.body;

  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }
  if (!otp) {
    return res.status(400).json({ error: 'OTP is required' });
  }

  const db = dbService.getData();
  const otpRecord = db.otp_verifications.find(
    (o) => o.user_id === user.id && o.purpose === 'PASSWORD_CHANGE' && !o.is_used
  );

  if (!otpRecord) {
    return res.status(400).json({ error: 'No active OTP request found. Please request a new OTP.' });
  }

  if (new Date(otpRecord.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'OTP expired. Please request a new OTP.' });
  }

  if (otpRecord.attempts >= otpRecord.max_attempts) {
    return res.status(400).json({ error: 'Maximum verification attempts exceeded. Please request a new OTP.' });
  }

  otpRecord.attempts += 1;

  if (!verifyOTP(otp.toString().trim(), otpRecord.otp_hash)) {
    dbService.saveSync();
    const remaining = otpRecord.max_attempts - otpRecord.attempts;
    return res.status(400).json({ error: `Invalid OTP. ${remaining} attempts remaining.` });
  }

  // Mark OTP used
  otpRecord.is_used = true;

  // Update password
  const dbUser = db.users.find((u) => u.id === user.id);
  if (!dbUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const newAuth = hashPassword(new_password);
  dbUser.password_hash = newAuth.hash;
  dbUser.salt = newAuth.salt;
  dbUser.updated_at = new Date().toISOString();

  dbService.saveSync();

  dbService.logActivity(
    dbUser.name,
    'PASSWORD_CHANGED',
    `User ${dbUser.username} successfully changed password via OTP verification`,
    dbUser.id
  );

  res.json({ success: true, message: 'Password changed successfully!' });
});

// -------------------------------------------------------------
// CATEGORIES
// -------------------------------------------------------------
apiRouter.get('/categories', (req, res) => {
  const db = dbService.getData();
  res.json(db.categories.sort((a, b) => a.display_order - b.display_order));
});

apiRouter.post('/categories', authMiddleware, (req, res) => {
  const { name, description, image_url, display_order } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  const db = dbService.getData();
  const id = db.categories.length > 0 ? Math.max(...db.categories.map((c) => c.id)) + 1 : 1;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const newCat: Category = {
    id,
    name,
    slug,
    description: description || '',
    image_url: image_url || 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=400&q=80',
    display_order: Number(display_order) || db.categories.length + 1,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  db.categories.push(newCat);
  dbService.saveSync();
  dbService.logActivity((req as any).user.name, 'CATEGORY_ADDED', `Created category ${name}`, (req as any).user.id);
  res.json({ success: true, ...newCat });
});

apiRouter.put('/categories/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, description, image_url, display_order, is_active } = req.body;

  const db = dbService.getData();
  const cat = db.categories.find((c) => c.id === id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });

  if (name !== undefined) cat.name = name;
  if (description !== undefined) cat.description = description;
  if (image_url !== undefined) cat.image_url = image_url;
  if (display_order !== undefined) cat.display_order = Number(display_order);
  if (is_active !== undefined) cat.is_active = Boolean(is_active);

  dbService.saveSync();
  dbService.logActivity((req as any).user.name, 'CATEGORY_UPDATED', `Updated category ${cat.name}`, (req as any).user.id);
  res.json({ success: true, ...cat });
});

apiRouter.delete('/categories/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = dbService.getData();
  const index = db.categories.findIndex((c) => c.id === id);
  if (index === -1) return res.status(404).json({ error: 'Category not found' });

  const removed = db.categories.splice(index, 1)[0];
  dbService.saveSync();
  dbService.logActivity((req as any).user.name, 'CATEGORY_DELETED', `Deleted category ${removed.name}`, (req as any).user.id);
  res.json({ success: true, message: `Category ${removed.name} deleted` });
});

// -------------------------------------------------------------
// PRODUCTS
// -------------------------------------------------------------
apiRouter.get('/products', (req, res) => {
  const { category_id, search, sort, stock_status } = req.query;
  const db = dbService.getData();
  let list = [...db.products];

  if (category_id && category_id !== 'all') {
    const catId = parseInt(category_id as string, 10);
    list = list.filter((p) => p.category_id === catId);
  }

  if (search) {
    const q = (search as string).toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        (p.category_name && p.category_name.toLowerCase().includes(q))
    );
  }

  if (stock_status) {
    if (stock_status === 'AVAILABLE') {
      list = list.filter((p) => p.stock_quantity > p.min_stock_alert);
    } else if (stock_status === 'LOW_STOCK') {
      list = list.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_alert);
    } else if (stock_status === 'OUT_OF_STOCK') {
      list = list.filter((p) => p.stock_quantity <= 0);
    }
  }

  if (sort === 'price_asc') {
    list.sort((a, b) => a.selling_price - b.selling_price);
  } else if (sort === 'price_desc') {
    list.sort((a, b) => b.selling_price - a.selling_price);
  } else if (sort === 'discount_desc') {
    list.sort((a, b) => b.discount_percentage - a.discount_percentage);
  } else if (sort === 'name_asc') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  res.json(list);
});

// Fast autocomplete search (Section 6)
apiRouter.get('/products/search', (req, res) => {
  const q = (req.query.q as string || '').toLowerCase().trim();
  if (!q) return res.json([]);

  const db = dbService.getData();
  const matches = db.products
    .filter(
      (p) =>
        p.is_active &&
        (p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q) ||
          (p.category_name && p.category_name.toLowerCase().includes(q)))
    )
    .slice(0, 15);

  res.json(matches);
});

// Barcode Lookup for USB Barcode Scanners (Section 21)
apiRouter.get('/products/barcode/:barcode', (req, res) => {
  const barcode = req.params.barcode.trim();
  const db = dbService.getData();
  const product = db.products.find((p) => p.barcode === barcode || p.code.toLowerCase() === barcode.toLowerCase());
  if (!product) {
    return res.status(404).json({ error: `No product found for barcode: ${barcode}` });
  }
  res.json(product);
});

apiRouter.post('/products', authMiddleware, (req, res) => {
  const {
    name,
    code,
    barcode,
    category_id,
    content,
    description,
    mrp,
    discount_percentage,
    selling_price,
    stock_quantity,
    min_stock_alert,
    image_url,
  } = req.body;

  if (!name || !mrp) {
    return res.status(400).json({ error: 'Product name and MRP are required' });
  }

  const db = dbService.getData();
  const cat = db.categories.find((c) => c.id === parseInt(category_id, 10));

  const parsedMrp = parseFloat(mrp);
  const parsedDisc = parseFloat(discount_percentage) || 0;
  // Automatically calculate Selling Price = MRP - Discount (Section 25)
  const calcSelling = selling_price !== undefined && selling_price !== ''
    ? parseFloat(selling_price)
    : Math.round(parsedMrp - (parsedMrp * parsedDisc) / 100);

  const id = db.products.length > 0 ? Math.max(...db.products.map((p) => p.id)) + 1 : 1;
  const newProduct: Product = {
    id,
    name,
    code: code || `DC-${id.toString().padStart(4, '0')}`,
    barcode: barcode || `89012345${id.toString().padStart(4, '0')}`,
    category_id: parseInt(category_id, 10) || 1,
    category_name: cat?.name || 'General Crackers',
    content: content || '1 Box',
    description: description || '',
    mrp: parsedMrp,
    discount_percentage: parsedDisc,
    selling_price: calcSelling,
    stock_quantity: parseInt(stock_quantity, 10) || 0,
    min_stock_alert: parseInt(min_stock_alert, 10) || 20,
    is_active: true,
    image_url: image_url || 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=500&q=80',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.products.push(newProduct);

  // If initial stock was provided, record stock transaction
  if (newProduct.stock_quantity > 0) {
    const txId = db.stock_transactions.length > 0 ? Math.max(...db.stock_transactions.map((t) => t.id)) + 1 : 1;
    db.stock_transactions.unshift({
      id: txId,
      product_id: newProduct.id,
      product_name: newProduct.name,
      transaction_type: 'STOCK_ADDED',
      quantity: newProduct.stock_quantity,
      previous_stock: 0,
      new_stock: newProduct.stock_quantity,
      user_id: (req as any).user.id,
      user_name: (req as any).user.name,
      notes: 'Initial stock on product creation',
      created_at: new Date().toISOString(),
    });
  }

  dbService.saveSync();
  dbService.logActivity((req as any).user.name, 'PRODUCT_ADDED', `Added new product ${newProduct.name}`, (req as any).user.id);

  res.json({ success: true, ...newProduct });
});

apiRouter.put('/products/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = dbService.getData();
  const prod = db.products.find((p) => p.id === id);
  if (!prod) return res.status(404).json({ error: 'Product not found' });

  const {
    name,
    code,
    barcode,
    category_id,
    content,
    description,
    mrp,
    discount_percentage,
    selling_price,
    min_stock_alert,
    is_active,
    image_url,
  } = req.body;

  if (name !== undefined) prod.name = name;
  if (code !== undefined) prod.code = code;
  if (barcode !== undefined) prod.barcode = barcode;
  if (content !== undefined) prod.content = content;
  if (category_id !== undefined) {
    prod.category_id = parseInt(category_id, 10);
    const cat = db.categories.find((c) => c.id === prod.category_id);
    if (cat) prod.category_name = cat.name;
  }
  if (description !== undefined) prod.description = description;
  if (mrp !== undefined) prod.mrp = parseFloat(mrp);
  if (discount_percentage !== undefined) prod.discount_percentage = parseFloat(discount_percentage);

  if (selling_price !== undefined && selling_price !== '') {
    prod.selling_price = parseFloat(selling_price);
  } else if (mrp !== undefined || discount_percentage !== undefined) {
    prod.selling_price = Math.round(prod.mrp - (prod.mrp * prod.discount_percentage) / 100);
  }

  if (min_stock_alert !== undefined) prod.min_stock_alert = parseInt(min_stock_alert, 10);
  if (is_active !== undefined) prod.is_active = Boolean(is_active);
  if (image_url !== undefined) prod.image_url = image_url;
  prod.updated_at = new Date().toISOString();

  dbService.saveSync();
  dbService.logActivity((req as any).user.name, 'PRODUCT_UPDATED', `Updated product ${prod.name}`, (req as any).user.id);
  res.json({ success: true, ...prod });
});

apiRouter.delete('/products/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = dbService.getData();
  const index = db.products.findIndex((p) => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Product not found' });

  const removed = db.products.splice(index, 1)[0];
  dbService.saveSync();
  dbService.logActivity((req as any).user.name, 'PRODUCT_DELETED', `Deleted product ${removed.name}`, (req as any).user.id);
  res.json({ success: true, message: `Product ${removed.name} deleted` });
});

// -------------------------------------------------------------
// STOCK MANAGEMENT (Sections 26, 27, 28)
// -------------------------------------------------------------
apiRouter.get('/stock', (req, res) => {
  const db = dbService.getData();
  const stockItems = db.products.map((p) => {
    let status = 'AVAILABLE';
    if (p.stock_quantity <= 0) {
      status = 'OUT_OF_STOCK';
    } else if (p.stock_quantity <= p.min_stock_alert) {
      status = 'LOW_STOCK';
    }
    return {
      product_id: p.id,
      name: p.name,
      code: p.code,
      barcode: p.barcode,
      category_name: p.category_name,
      current_stock: p.stock_quantity,
      min_stock: p.min_stock_alert,
      status,
      selling_price: p.selling_price,
    };
  });
  res.json(stockItems);
});

apiRouter.post('/stock/add', authMiddleware, (req, res) => {
  const { product_id, quantity, notes } = req.body;
  const qty = parseInt(quantity, 10);
  if (!product_id || !qty || qty <= 0) {
    return res.status(400).json({ error: 'Valid product and positive quantity required' });
  }

  const db = dbService.getData();
  const prod = db.products.find((p) => p.id === parseInt(product_id, 10));
  if (!prod) return res.status(404).json({ error: 'Product not found' });

  const prevStock = prod.stock_quantity;
  const newStock = prevStock + qty;
  prod.stock_quantity = newStock;
  prod.updated_at = new Date().toISOString();

  // Stock Transaction record (Section 26 & 28)
  const txId = db.stock_transactions.length > 0 ? Math.max(...db.stock_transactions.map((t) => t.id)) + 1 : 1;
  const tx: StockTransaction = {
    id: txId,
    product_id: prod.id,
    product_name: prod.name,
    transaction_type: 'STOCK_ADDED',
    quantity: qty,
    previous_stock: prevStock,
    new_stock: newStock,
    user_id: (req as any).user.id,
    user_name: (req as any).user.name,
    notes: notes || 'Manual stock loading',
    created_at: new Date().toISOString(),
  };

  db.stock_transactions.unshift(tx);
  dbService.saveSync();

  dbService.logActivity(
    (req as any).user.name,
    'STOCK_ADDED',
    `Added ${qty} units to ${prod.name} (Previous: ${prevStock}, New: ${newStock})`,
    (req as any).user.id
  );

  res.json({ success: true, message: `Added ${qty} units to ${prod.name}`, product: prod, transaction: tx });
});

apiRouter.get('/stock/transactions', (req, res) => {
  const { product_id, type } = req.query;
  const db = dbService.getData();
  let list = [...db.stock_transactions];

  if (product_id) {
    const pid = parseInt(product_id as string, 10);
    list = list.filter((t) => t.product_id === pid);
  }
  if (type) {
    list = list.filter((t) => t.transaction_type === type);
  }

  res.json(list.slice(0, 100));
});

apiRouter.get('/stock/logs', (req, res) => {
  const db = dbService.getData();
  res.json(db.stock_transactions.slice(0, 100));
});

apiRouter.post('/products/:id/stock', authMiddleware, (req, res) => {
  const productId = parseInt(req.params.id, 10);
  const { quantity, notes } = req.body;
  const qty = parseInt(quantity, 10);
  if (!productId || !qty || qty <= 0) {
    return res.status(400).json({ error: 'Valid product and positive quantity required' });
  }

  const db = dbService.getData();
  const prod = db.products.find((p) => p.id === productId);
  if (!prod) return res.status(404).json({ error: 'Product not found' });

  const prevStock = prod.stock_quantity;
  const newStock = prevStock + qty;
  prod.stock_quantity = newStock;
  prod.updated_at = new Date().toISOString();

  const txId = db.stock_transactions.length > 0 ? Math.max(...db.stock_transactions.map((t) => t.id)) + 1 : 1;
  const tx: StockTransaction = {
    id: txId,
    product_id: prod.id,
    product_name: prod.name,
    transaction_type: 'STOCK_ADDED',
    quantity: qty,
    previous_stock: prevStock,
    new_stock: newStock,
    user_id: (req as any).user.id,
    user_name: (req as any).user.name,
    notes: notes || 'Stock arrival',
    created_at: new Date().toISOString(),
  };

  db.stock_transactions.unshift(tx);
  dbService.saveSync();
  dbService.logActivity(
    (req as any).user.name,
    'STOCK_ADDED',
    `Added ${qty} units to ${prod.name} (Previous: ${prevStock}, New: ${newStock})`,
    (req as any).user.id
  );

  res.json({ success: true, message: `Added ${qty} units to ${prod.name}`, product: prod, transaction: tx });
});

// -------------------------------------------------------------
// ORDER CONFIRMATION & BILLING (Sections 9, 10, 20, 22, 27)
// -------------------------------------------------------------
apiRouter.post('/orders', asyncHandler(async (req, res) => {
  const customer_name = (req.body.customer_name || req.body.name || '').trim();
  const customer_mobile = (req.body.customer_mobile || req.body.mobile || '').replace(/\D/g, '');
  const customer_email = (req.body.customer_email || req.body.email || '').trim();
  const district = (req.body.district || req.body.city || 'Kanchipuram').trim();
  const city = (req.body.city || district).trim();
  const state = (req.body.state || 'Tamil Nadu').trim();
  const area = (req.body.area || '').trim();
  const pincode = (req.body.pincode || '').trim();
  const address = (req.body.address || req.body.delivery_address || `${area ? area + ', ' : ''}${district}, ${state}`).trim();
  const notes = (req.body.notes || '').trim();
  const payment_mode = req.body.payment_mode || 'CASH';
  const transaction_ref = req.body.transaction_ref || req.body.payment_reference || '';
  const payment_screenshot = req.body.payment_screenshot || '';
  const items = req.body.items;

  // 1. Validate customer details (Section 10)
  if (!customer_name) {
    return res.status(400).json({ error: 'Customer name is required' });
  }
  if (!customer_mobile || customer_mobile.length < 10) {
    return res.status(400).json({ error: 'Valid 10-digit mobile number is required' });
  }
  if (!address) {
    return res.status(400).json({ error: 'Delivery address is required' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required in the cart' });
  }

  const db = dbService.getData();

  // 2. Validate item shape & stock inside database transaction (Section 10 & 27)
  for (const it of items) {
    const prod = db.products.find((p) => p.id === it.product_id);
    if (!prod) {
      return res.status(400).json({ error: `Product ID ${it.product_id} not found` });
    }
    const qtyNum = Number(it.quantity);
    if (!Number.isFinite(qtyNum) || !Number.isInteger(qtyNum) || qtyNum < 1) {
      return res.status(400).json({ error: `Invalid quantity for "${prod.name}". Please refresh your cart and try again.` });
    }
    if (prod.stock_quantity < qtyNum) {
      return res.status(400).json({
        error: `Insufficient stock for "${prod.name}". Available: ${prod.stock_quantity}, Requested: ${qtyNum}`,
      });
    }
  }

  // 3. Calculate totals & build snapshot item data (Section 42: NEVER overwrite historical prices)
  let subtotal = 0;
  let totalSavings = 0;
  const orderItemsList: any[] = [];
  const invoiceItemsList: any[] = [];

  for (const it of items) {
    const prod = db.products.find((p) => p.id === it.product_id)!;
    const qty = Math.max(1, parseInt(it.quantity, 10));
    const mrp = prod.mrp;
    const sellingPrice = prod.selling_price;
    const itemTotal = sellingPrice * qty;
    const itemSavings = (mrp - sellingPrice) * qty;

    subtotal += mrp * qty;
    totalSavings += itemSavings;

    orderItemsList.push({
      product_id: prod.id,
      product_name: prod.name,
      mrp,
      discount_percentage: prod.discount_percentage,
      selling_price: sellingPrice,
      quantity: qty,
      item_total: itemTotal,
    });

    invoiceItemsList.push({
      product_id: prod.id,
      product_name: prod.name,
      mrp,
      discount: mrp - sellingPrice,
      selling_price: sellingPrice,
      quantity: qty,
      item_total: itemTotal,
    });
  }

  const grandTotal = subtotal - totalSavings;
  const orderNumber = dbService.generateNextOrderNumber();
  const invoiceNumber = dbService.generateNextInvoiceNumber();
  const now = new Date().toISOString();

  // 4. Find or Create Customer
  let customer = db.customers.find((c) => c.mobile.replace(/\D/g, '') === customer_mobile.replace(/\D/g, ''));
  const effectiveCity = district || city || 'Kanchipuram';
  const effectiveState = state || 'Tamil Nadu';
  const fullAddress = `${address.trim()}${area ? ', ' + area.trim() : ''}, ${effectiveCity}, ${effectiveState}${pincode ? ' - ' + pincode.trim() : ''}`;

  if (!customer) {
    const cid = db.customers.length > 0 ? Math.max(...db.customers.map((c) => c.id)) + 1 : 1;
    customer = {
      id: cid,
      name: customer_name.trim(),
      mobile: customer_mobile.trim(),
      email: customer_email?.trim() || '',
      address: address.trim(),
      area: area?.trim() || '',
      city: effectiveCity,
      pincode: pincode?.trim() || '',
      total_orders: 1,
      total_purchase: grandTotal,
      last_order_date: now,
      created_at: now,
      updated_at: now,
    };
    db.customers.push(customer);
  } else {
    customer.total_orders += 1;
    customer.total_purchase += grandTotal;
    customer.last_order_date = now;
    customer.updated_at = now;
    if (customer_email) customer.email = customer_email;
  }

  // 5. Create Order
  const orderId = db.orders.length > 0 ? Math.max(...db.orders.map((o) => o.id)) + 1 : 1;
  const newOrder: any = {
    id: orderId,
    order_number: orderNumber,
    invoice_number: invoiceNumber,
    customer_id: customer.id,
    customer_name: customer.name,
    customer_mobile: customer.mobile,
    customer_email: customer.email,
    customer_address: fullAddress,
    subtotal,
    discount: totalSavings,
    grand_total: grandTotal,
    status: 'CONFIRMED',
    order_source: 'CUSTOMER_WEBSITE',
    payment_mode: (payment_mode as PaymentMode) || 'ONLINE',
    transaction_id: transaction_ref || undefined,
    payment_screenshot: payment_screenshot || undefined,
    notes: notes ? `${notes} ${transaction_ref ? `[UTR: ${transaction_ref}]` : ''}`.trim() : (transaction_ref ? `[UTR: ${transaction_ref}]` : ''),
    items: orderItemsList.map((it, idx) => ({ ...it, id: idx + 1, order_id: orderId })),
    created_at: now,
    updated_at: now,
  };
  db.orders.unshift(newOrder);

  // 6. Create Invoice
  const invoiceId = db.invoices.length > 0 ? Math.max(...db.invoices.map((inv) => inv.id)) + 1 : 1;
  const newInvoice: any = {
    id: invoiceId,
    invoice_number: invoiceNumber,
    order_id: orderId,
    customer_name: customer.name,
    customer_mobile: customer.mobile,
    customer_address: fullAddress,
    subtotal,
    discount: totalSavings,
    grand_total: grandTotal,
    payment_mode: (payment_mode as PaymentMode) || 'ONLINE',
    transaction_id: transaction_ref || undefined,
    order_source: 'CUSTOMER_WEBSITE',
    status: payment_mode === 'CASH' ? 'PENDING' : 'PAID',
    whatsapp_status: 'PENDING',
    items: invoiceItemsList.map((it, idx) => ({ ...it, id: idx + 1, invoice_id: invoiceId })),
    created_at: now,
  };
  db.invoices.unshift(newInvoice);

  // 7. Record Payment
  const paymentId = db.payments.length > 0 ? Math.max(...db.payments.map((p) => p.id)) + 1 : 1;
  db.payments.unshift({
    id: paymentId,
    invoice_id: invoiceId,
    order_id: orderId,
    amount: grandTotal,
    payment_mode: newInvoice.payment_mode,
    transaction_ref: transaction_ref || `WEB_${Date.now()}`,
    status: payment_mode === 'CASH' ? 'PENDING' : 'COMPLETED',
    created_at: now,
  });

  // 8. Reduce Product Stock & Record Stock Transactions (Section 27)
  for (const it of items) {
    const prod = db.products.find((p) => p.id === it.product_id)!;
    const prev = prod.stock_quantity;
    const qtyNum = Math.trunc(Number(it.quantity));
    prod.stock_quantity -= qtyNum;
    prod.updated_at = now;

    const txId = db.stock_transactions.length > 0 ? Math.max(...db.stock_transactions.map((t) => t.id)) + 1 : 1;
    db.stock_transactions.unshift({
      id: txId,
      product_id: prod.id,
      product_name: prod.name,
      transaction_type: 'SALE',
      quantity: qtyNum,
      previous_stock: prev,
      new_stock: prod.stock_quantity,
      invoice_number: invoiceNumber,
      notes: `Online order from ${customer.name}`,
      created_at: now,
    });
  }

  // 9. WhatsApp notification is intentionally NOT auto-sent via the Meta
  // Cloud API here anymore — the store's WhatsApp number may already be
  // registered to a different WhatsApp Business account, so the customer's
  // browser instead auto-opens a pre-filled WhatsApp chat to the owner
  // (with a link to view/download the official bill PDF) right after this
  // response comes back — see OrderSuccessModal.tsx. This keeps delivery
  // working with zero WhatsApp API setup required.
  const waResult = { status: 'PENDING' as const, message: 'Redirecting to WhatsApp for manual send.' };

  newInvoice.whatsapp_status = waResult.status;

  dbService.saveSync();

  dbService.logActivity(
    customer.name,
    'WEBSITE_ORDER_PLACED',
    `Created Order ${orderNumber} & Invoice ${invoiceNumber} for ₹${grandTotal.toLocaleString('en-IN')}`,
    undefined,
    invoiceNumber
  );

  res.json({
    success: true,
    order: newOrder,
    invoice: newInvoice,
    whatsapp_status: waResult.status,
    whatsapp_message: waResult.message,
  });
}));

// Worker POS Billing (Section 20, 22, 23, 24)
apiRouter.post('/billing', authMiddleware, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const {
    customer_name,
    customer_mobile,
    customer_address,
    payment_mode,
    transaction_id,
    transaction_ref,
    items,
    notes,
    manual_discount = 0,
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required for billing' });
  }

  const db = dbService.getData();

  // Validate item shape & stock
  for (const it of items) {
    const prod = db.products.find((p) => p.id === it.product_id);
    if (!prod) {
      return res.status(400).json({ error: `Product ID ${it.product_id} not found` });
    }
    const qtyNum = Number(it.quantity);
    if (!Number.isFinite(qtyNum) || !Number.isInteger(qtyNum) || qtyNum < 1) {
      return res.status(400).json({ error: `Invalid quantity for "${prod.name}". Please re-check the bill.` });
    }
    if (it.selling_price !== undefined && !Number.isFinite(Number(it.selling_price))) {
      return res.status(400).json({ error: `Invalid selling price for "${prod.name}".` });
    }
    if (prod.stock_quantity < qtyNum) {
      return res.status(400).json({
        error: `Insufficient stock for "${prod.name}". Available: ${prod.stock_quantity}, Requested: ${qtyNum}`,
      });
    }
  }

  let subtotal = 0;
  let totalSavings = 0;
  const invoiceItemsList: any[] = [];

  for (const it of items) {
    const prod = db.products.find((p) => p.id === it.product_id)!;
    const qty = Math.max(1, parseInt(it.quantity, 10));
    // Allow custom worker selling price or default product selling price
    const mrp = prod.mrp;
    const sellingPrice = it.selling_price !== undefined ? parseFloat(it.selling_price) : prod.selling_price;
    const itemTotal = sellingPrice * qty;
    const itemSavings = (mrp - sellingPrice) * qty;

    subtotal += mrp * qty;
    totalSavings += itemSavings;

    invoiceItemsList.push({
      product_id: prod.id,
      product_name: prod.name,
      mrp,
      discount: mrp - sellingPrice,
      selling_price: sellingPrice,
      quantity: qty,
      item_total: itemTotal,
    });
  }

  const manualDiscountNum = Math.max(0, parseFloat(manual_discount) || 0);
  const grandTotal = Math.max(0, subtotal - totalSavings - manualDiscountNum);
  const totalCombinedDiscount = totalSavings + manualDiscountNum;
  const invoiceNumber = dbService.generateNextInvoiceNumber();
  const orderNumber = dbService.generateNextOrderNumber();
  const now = new Date().toISOString();

  const custName = customer_name?.trim() || 'Counter Walk-in Customer';
  const custMobile = customer_mobile?.trim() || 'Walk-in';
  const custAddress = customer_address?.trim() || 'Counter Sale, Sivakasi';

  // Find or create customer if mobile provided
  let customerId = 1;
  if (customer_mobile && customer_mobile.replace(/\D/g, '').length >= 10) {
    let customer = db.customers.find((c) => c.mobile.replace(/\D/g, '') === custMobile.replace(/\D/g, ''));
    if (!customer) {
      customerId = db.customers.length > 0 ? Math.max(...db.customers.map((c) => c.id)) + 1 : 1;
      customer = {
        id: customerId,
        name: custName,
        mobile: custMobile,
        address: custAddress,
        total_orders: 1,
        total_purchase: grandTotal,
        last_order_date: now,
        created_at: now,
        updated_at: now,
      };
      db.customers.push(customer);
    } else {
      customer.total_orders += 1;
      customer.total_purchase += grandTotal;
      customer.last_order_date = now;
      customerId = customer.id;
    }
  }

  const effectiveTxRef = transaction_id || transaction_ref || `POS_${user.id}_${Date.now()}`;
  const fullNotes = [notes, transaction_id ? `Txn ID: ${transaction_id}` : ''].filter(Boolean).join(' • ');

  // Create Order
  const orderId = db.orders.length > 0 ? Math.max(...db.orders.map((o) => o.id)) + 1 : 1;
  const newOrder: Order = {
    id: orderId,
    order_number: orderNumber,
    invoice_number: invoiceNumber,
    customer_id: customerId,
    customer_name: custName,
    customer_mobile: custMobile,
    customer_address: custAddress,
    subtotal,
    discount: totalCombinedDiscount,
    grand_total: grandTotal,
    status: 'CONFIRMED',
    order_source: 'WORKER_POS',
    worker_id: user.id,
    worker_name: user.name,
    payment_mode: (payment_mode as PaymentMode) || 'CASH',
    notes: fullNotes || 'Counter POS Bill',
    items: invoiceItemsList.map((it, idx) => ({ ...it, id: idx + 1, order_id: orderId, discount_percentage: 0 })),
    created_at: now,
    updated_at: now,
  };
  db.orders.unshift(newOrder);

  // Create Invoice
  const invoiceId = db.invoices.length > 0 ? Math.max(...db.invoices.map((inv) => inv.id)) + 1 : 1;
  const newInvoice: Invoice = {
    id: invoiceId,
    invoice_number: invoiceNumber,
    order_id: orderId,
    customer_name: custName,
    customer_mobile: custMobile,
    customer_address: custAddress,
    subtotal,
    discount: totalCombinedDiscount,
    grand_total: grandTotal,
    payment_mode: (payment_mode as PaymentMode) || 'CASH',
    order_source: 'WORKER_POS',
    worker_id: user.id,
    worker_name: user.name,
    status: 'PAID',
    whatsapp_status: 'PENDING',
    items: invoiceItemsList.map((it, idx) => ({ ...it, id: idx + 1, invoice_id: invoiceId })),
    created_at: now,
  };
  db.invoices.unshift(newInvoice);

  // Record Payment
  const paymentId = db.payments.length > 0 ? Math.max(...db.payments.map((p) => p.id)) + 1 : 1;
  db.payments.unshift({
    id: paymentId,
    invoice_id: invoiceId,
    order_id: orderId,
    amount: grandTotal,
    payment_mode: newInvoice.payment_mode,
    transaction_ref: effectiveTxRef,
    status: 'COMPLETED',
    created_at: now,
  });

  // Reduce Stock & Record Transactions
  for (const it of items) {
    const prod = db.products.find((p) => p.id === it.product_id)!;
    const prev = prod.stock_quantity;
    const qtyNum = Math.trunc(Number(it.quantity));
    prod.stock_quantity -= qtyNum;
    prod.updated_at = now;

    const txId = db.stock_transactions.length > 0 ? Math.max(...db.stock_transactions.map((t) => t.id)) + 1 : 1;
    db.stock_transactions.unshift({
      id: txId,
      product_id: prod.id,
      product_name: prod.name,
      transaction_type: 'SALE',
      quantity: qtyNum,
      previous_stock: prev,
      new_stock: prod.stock_quantity,
      user_id: user.id,
      user_name: user.name,
      invoice_number: invoiceNumber,
      notes: `POS counter bill by ${user.name}`,
      created_at: now,
    });
  }

  // WhatsApp is intentionally NOT auto-sent via the Meta Cloud API here —
  // the Worker POS already opens a pre-filled WhatsApp chat with the bill
  // download link client-side (see WorkerPOS.tsx: sendInvoiceViaWhatsApp)
  // when the cashier opts to send it, so no server-side API call is needed.
  const waResult = { status: 'PENDING' as const, message: 'Redirecting to WhatsApp for manual send.' };

  newInvoice.whatsapp_status = waResult.status;
  dbService.saveSync();

  dbService.logActivity(
    user.name,
    'POS_BILL_CREATED',
    `Generated Bill ${invoiceNumber} for ₹${grandTotal.toLocaleString('en-IN')}. Payment: ${newInvoice.payment_mode}`,
    user.id,
    invoiceNumber
  );

  res.json({
    success: true,
    invoice: newInvoice,
    whatsapp_status: waResult.status,
    whatsapp_message: waResult.message,
  });
}));

// -------------------------------------------------------------
// INVOICES & ORDERS GET
// -------------------------------------------------------------
apiRouter.get('/invoices', optionalAuthMiddleware, (req, res) => {
  const { worker_id, payment_mode, order_source, search, limit } = req.query;
  const db = dbService.getData();
  let list = [...db.invoices];

  const user = (req as any).user;
  // If authenticated as WORKER, limit to their bills unless owner
  if (user && user.role === 'WORKER') {
    list = list.filter((inv) => inv.worker_id === user.id);
  } else if (worker_id) {
    const wid = parseInt(worker_id as string, 10);
    list = list.filter((inv) => inv.worker_id === wid);
  }

  if (payment_mode) {
    list = list.filter((inv) => inv.payment_mode === payment_mode);
  }
  if (order_source) {
    list = list.filter((inv) => inv.order_source === order_source);
  }
  if (search) {
    const q = (search as string).toLowerCase().trim();
    list = list.filter(
      (inv) =>
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.customer_name.toLowerCase().includes(q) ||
        inv.customer_mobile.includes(q)
    );
  }

  const max = limit ? parseInt(limit as string, 10) : 100;
  res.json(list.slice(0, max));
});

apiRouter.get('/invoices/:id', (req, res) => {
  const idOrNumber = req.params.id;
  const db = dbService.getData();
  const invoice = db.invoices.find(
    (inv) => inv.id.toString() === idOrNumber || inv.invoice_number.toLowerCase() === idOrNumber.toLowerCase()
  );
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json(invoice);
});

apiRouter.post('/invoices/:id/resend-whatsapp', authMiddleware, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = dbService.getData();
  const invoice = db.invoices.find((inv) => inv.id === id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const result = await sendWhatsAppInvoiceNotification({
    recipientType: 'OWNER',
    recipientPhone: db.settings.owner_whatsapp || '919842100000',
    invoiceNumber: invoice.invoice_number,
    invoiceId: invoice.id,
    customerName: invoice.customer_name,
    totalAmount: invoice.grand_total,
    isWorkerBill: invoice.order_source === 'WORKER_POS',
    workerName: invoice.worker_name,
    paymentMode: invoice.payment_mode,
    invoice: invoice,
  });

  invoice.whatsapp_status = result.status;
  dbService.saveSync();

  res.json(result);
}));

// Delete Invoice Endpoint (Section User Request: ithu delete optaoin kudu)
apiRouter.delete('/invoices/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = dbService.getData();
  const index = db.invoices.findIndex((inv) => inv.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  const deletedInvoice = db.invoices.splice(index, 1)[0];

  // Also remove associated order and payment if present
  const orderIdx = db.orders.findIndex((o) => o.invoice_number === deletedInvoice.invoice_number);
  if (orderIdx !== -1) {
    db.orders.splice(orderIdx, 1);
  }
  const payIdx = db.payments.findIndex((p) => p.invoice_id === deletedInvoice.id);
  if (payIdx !== -1) {
    db.payments.splice(payIdx, 1);
  }

  dbService.saveSync();

  const user = (req as any).user;
  dbService.logActivity(
    user?.name || 'Admin',
    'INVOICE_DELETED',
    `Deleted Invoice ${deletedInvoice.invoice_number} (Grand Total: ₹${deletedInvoice.grand_total})`,
    user?.id,
    deletedInvoice.invoice_number
  );

  res.json({
    success: true,
    message: `Invoice ${deletedInvoice.invoice_number} successfully deleted.`,
    invoice: deletedInvoice,
  });
});

// Customer Tracking - Get Bills for a specific user/customer (User Request: user pannel la user pota bill matum than varunum)
apiRouter.get('/user-bills', (req, res) => {
  const mobile = (req.query.mobile as string || '').replace(/\D/g, '');
  if (!mobile || mobile.length < 10) {
    return res.status(400).json({ error: 'Please provide a valid 10-digit mobile number' });
  }

  const db = dbService.getData();
  // Filter invoices strictly belonging to this mobile number
  const userInvoices = db.invoices.filter((inv) => {
    const invMobile = (inv.customer_mobile || '').replace(/\D/g, '');
    return invMobile.endsWith(mobile) || mobile.endsWith(invMobile);
  });

  res.json({
    success: true,
    mobile,
    total_bills: userInvoices.length,
    invoices: userInvoices,
  });
});

// Razorpay / Auto UPI Intent Endpoint (User Request: upi kudutha bill vaule set auto upi varum using rapropay)
apiRouter.post('/payment/create-order', (req, res) => {
  const { amount, customer_name, customer_mobile, notes } = req.body;
  const numAmount = parseFloat(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Valid payment amount required' });
  }

  const db = dbService.getData();
  const shopName = db.settings.shop_name || 'DEVARAJ TRADERS';
  const upiId = db.settings.upi_id || '8870929100@okbizaxis';
  const orderReceipt = `ORD_${Date.now()}`;

  // Generate UPI Intent deep link URL
  const encodedName = encodeURIComponent(shopName);
  const encodedNote = encodeURIComponent(`Diwali Crackers Order ${orderReceipt}`);
  const upiUri = `upi://pay?pa=${upiId}&pn=${encodedName}&am=${numAmount.toFixed(2)}&cu=INR&tn=${encodedNote}`;

  // Razorpay standard checkout configuration
  const razorpayConfig = {
    key: process.env.RAZORPAY_KEY_ID || 'rzp_test_devarajcrackers',
    amount: Math.round(numAmount * 100), // In paise
    currency: 'INR',
    name: 'தேவராஜ் பட்டாசு கடை',
    description: `Festival Crackers Bill Payment (₹${numAmount.toLocaleString('en-IN')})`,
    image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=120&q=80',
    order_id: `order_${Date.now()}`,
    prefill: {
      name: customer_name || '',
      contact: customer_mobile || '',
    },
    theme: {
      color: '#dc2626',
    },
    upiUri,
    upiId,
  };

  res.json({
    success: true,
    order_receipt: orderReceipt,
    amount: numAmount,
    upi_uri: upiUri,
    upi_id: upiId,
    razorpay: razorpayConfig,
  });
});


// -------------------------------------------------------------
// REPORTS & DASHBOARDS (Sections 16, 17, 18, 19, 41)
// -------------------------------------------------------------
const getDashboardMetrics = (req: Request, res: Response) => {
  const db = dbService.getData();
  const user = (req as any).user;
  const isWorker = user && user.role === 'WORKER';

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yestStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  // If worker, only calculate for their own bills
  const baseInvoices = isWorker ? db.invoices.filter((inv) => inv.worker_id === user.id) : db.invoices;

  const todayInvoices = baseInvoices.filter((inv) => new Date(inv.created_at).getTime() >= todayStart);
  const todaySales = todayInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);

  const yestInvoices = baseInvoices.filter((inv) => {
    const t = new Date(inv.created_at).getTime();
    return t >= yestStart && t < todayStart;
  });
  const yesterdaySales = yestInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);

  const thisMonthInvoices = baseInvoices.filter((inv) => new Date(inv.created_at).getTime() >= monthStart);
  const thisMonthSales = thisMonthInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);
  const thisMonthBills = thisMonthInvoices.length;

  const totalSales = baseInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);
  const totalBills = baseInvoices.length;
  const totalCustomers = isWorker
    ? new Set(baseInvoices.map((i) => i.customer_mobile)).size
    : db.customers.length;

  const handCash = baseInvoices
    .filter((inv) => inv.payment_mode === 'CASH')
    .reduce((sum, inv) => sum + inv.grand_total, 0);

  const onlineSales = baseInvoices
    .filter((inv) => inv.payment_mode === 'ONLINE' || inv.payment_mode === 'UPI')
    .reduce((sum, inv) => sum + inv.grand_total, 0);

  const totalProducts = db.products.length;
  const lowStock = db.products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_alert).length;
  const outOfStock = db.products.filter((p) => p.stock_quantity <= 0).length;
  const totalWorkers = db.users.filter((u) => u.role === 'WORKER' && u.status === 'ACTIVE').length;

  res.json({
    today_sales: todaySales,
    today_bills: todayInvoices.length,
    yesterday_sales: yesterdaySales,
    yesterday_bills: yestInvoices.length,
    this_month_sales: thisMonthSales,
    this_month_bills: thisMonthBills,
    total_sales: totalSales,
    total_bills: totalBills,
    total_customers: totalCustomers,
    hand_cash: handCash,
    online_sales: onlineSales,
    total_products: totalProducts,
    low_stock: lowStock,
    out_of_stock: outOfStock,
    total_workers: totalWorkers,
    worker_id: isWorker ? user.id : undefined,
    worker_name: isWorker ? user.name : undefined,
  });
};

apiRouter.get('/reports/dashboard', authMiddleware, getDashboardMetrics);
apiRouter.get('/dashboard/metrics', authMiddleware, getDashboardMetrics);

// Comprehensive Sales Report endpoint (Section 16, 17, 30)
apiRouter.get('/reports/sales', authMiddleware, (req, res) => {
  const { period, start, end, worker_id, payment_mode } = req.query;
  const user = (req as any).user;
  const isWorker = user && user.role === 'WORKER';

  const db = dbService.getData();
  let list = [...db.invoices];

  // If worker, restrict strictly to their own bills
  if (isWorker) {
    list = list.filter((inv) => inv.worker_id === user.id);
  }

  // Date filtering
  const now = new Date();
  if (period === 'today') {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    list = list.filter((inv) => new Date(inv.created_at).getTime() >= todayStart);
  } else if (period === 'yesterday') {
    const yestStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
    const yestEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    list = list.filter((inv) => {
      const t = new Date(inv.created_at).getTime();
      return t >= yestStart && t < yestEnd;
    });
  } else if (period === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    list = list.filter((inv) => new Date(inv.created_at).getTime() >= weekAgo);
  } else if (period === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    list = list.filter((inv) => new Date(inv.created_at).getTime() >= monthStart);
  } else if (period === 'custom' && start && end) {
    const startTime = new Date(`${start}T00:00:00`).getTime();
    const endTime = new Date(`${end}T23:59:59.999`).getTime();
    list = list.filter((inv) => {
      const t = new Date(inv.created_at).getTime();
      return t >= startTime && t <= endTime;
    });
  }

  // Filter by worker (for owners)
  if (!isWorker && worker_id && worker_id !== 'all') {
    const wid = parseInt(worker_id as string, 10);
    list = list.filter((inv) => inv.worker_id === wid);
  }

  // Filter by payment mode
  if (payment_mode && payment_mode !== 'all') {
    list = list.filter((inv) => inv.payment_mode === payment_mode);
  }

  // Sort newest first
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Aggregate summary
  const totalSales = list.reduce((sum, inv) => sum + inv.grand_total, 0);
  const totalBills = list.length;
  const cashTotal = list.filter((inv) => inv.payment_mode === 'CASH').reduce((sum, inv) => sum + inv.grand_total, 0);
  const upiTotal = list.filter((inv) => inv.payment_mode === 'UPI').reduce((sum, inv) => sum + inv.grand_total, 0);
  const onlineTotal = list.filter((inv) => inv.payment_mode === 'ONLINE' || inv.payment_mode === 'CARD').reduce((sum, inv) => sum + inv.grand_total, 0);
  const discountGiven = list.reduce((sum, inv) => sum + (inv.discount || 0), 0);
  const totalMrp = list.reduce((sum, inv) => sum + (inv.subtotal || inv.grand_total), 0);
  const averageBillValue = totalBills > 0 ? Math.round(totalSales / totalBills) : 0;
  const totalItemsSold = list.reduce((sum, inv) => sum + inv.items.reduce((s, it) => s + it.quantity, 0), 0);

  // Aggregate item breakdown ("எந்த பட்டாசு எவ்வளவு விற்றுள்ளது?")
  const itemMap = new Map<number, {
    product_id: number;
    product_name: string;
    code: string;
    category_name: string;
    content: string;
    image_url: string;
    total_quantity: number;
    total_revenue: number;
    total_discount: number;
    orders_count: number;
  }>();

  for (const inv of list) {
    for (const it of inv.items) {
      const prod = db.products.find((p) => p.id === it.product_id);
      const existing = itemMap.get(it.product_id);
      const itemDiscount = (it.discount || 0) * it.quantity;
      if (existing) {
        existing.total_quantity += it.quantity;
        existing.total_revenue += it.item_total;
        existing.total_discount += itemDiscount;
        existing.orders_count += 1;
      } else {
        itemMap.set(it.product_id, {
          product_id: it.product_id,
          product_name: it.product_name || prod?.name || `Product #${it.product_id}`,
          code: prod?.code || '',
          category_name: prod?.category_name || 'General',
          content: prod?.content || '1 Box',
          image_url: prod?.image_url || 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=400&q=80',
          total_quantity: it.quantity,
          total_revenue: it.item_total,
          total_discount: itemDiscount,
          orders_count: 1,
        });
      }
    }
  }

  const itemBreakdown = Array.from(itemMap.values()).sort((a, b) => b.total_quantity - a.total_quantity);

  res.json({
    summary: {
      total_sales: totalSales,
      total_bills: totalBills,
      cash_total: cashTotal,
      upi_total: upiTotal,
      online_total: onlineTotal,
      discount_given: discountGiven,
      total_mrp: totalMrp,
      average_bill_value: averageBillValue,
      total_items_sold: totalItemsSold,
    },
    invoices: list,
    item_breakdown: itemBreakdown,
  });
});

apiRouter.get('/reports/workers', authMiddleware, (req, res) => {
  const db = dbService.getData();
  const user = (req as any).user;
  let staffUsers = db.users;
  if (user && user.role === 'WORKER') {
    staffUsers = staffUsers.filter((u) => u.id === user.id);
  }

  const report = staffUsers.map((w) => {
    const workerBills = db.invoices.filter((inv) => inv.worker_id === w.id);
    const totalSales = workerBills.reduce((acc, inv) => acc + inv.grand_total, 0);
    const cashCollected = workerBills.filter((b) => b.payment_mode === 'CASH').reduce((acc, b) => acc + b.grand_total, 0);
    const onlineCollected = workerBills.filter((b) => b.payment_mode === 'UPI' || b.payment_mode === 'CARD' || b.payment_mode === 'ONLINE').reduce((acc, b) => acc + b.grand_total, 0);
    const totalItems = workerBills.reduce((acc, inv) => acc + inv.items.reduce((s, it) => s + it.quantity, 0), 0);

    return {
      worker_id: w.id,
      name: w.name,
      username: w.username,
      mobile: w.mobile,
      role: w.role,
      bills_count: workerBills.length,
      total_sales: totalSales,
      cash_collected: cashCollected,
      online_collected: onlineCollected,
      total_items_sold: totalItems,
      bills: workerBills,
    };
  });

  res.json({ workers: report });
});

apiRouter.get('/reports/payments', ownerOnlyMiddleware, (req, res) => {
  const db = dbService.getData();
  const modes: PaymentMode[] = ['CASH', 'UPI', 'CARD', 'ONLINE', 'OTHER'];

  const breakdown = modes.map((mode) => {
    const invs = db.invoices.filter((i) => i.payment_mode === mode);
    const total = invs.reduce((sum, i) => sum + i.grand_total, 0);
    return {
      mode,
      count: invs.length,
      total,
    };
  });

  const grandTotal = breakdown.reduce((acc, b) => acc + b.total, 0);

  res.json({
    breakdown,
    grand_total: grandTotal,
  });
});

// Product sales history (Section 30: Item History)
apiRouter.get('/reports/products', ownerOnlyMiddleware, (req, res) => {
  const db = dbService.getData();
  const stats: Record<number, { product_id: number; product_name: string; total_sold: number; total_revenue: number; sales: any[] }> = {};

  for (const inv of db.invoices) {
    for (const item of inv.items) {
      if (!stats[item.product_id]) {
        stats[item.product_id] = {
          product_id: item.product_id,
          product_name: item.product_name,
          total_sold: 0,
          total_revenue: 0,
          sales: [],
        };
      }
      stats[item.product_id].total_sold += item.quantity;
      stats[item.product_id].total_revenue += item.item_total;
      stats[item.product_id].sales.push({
        invoice_number: inv.invoice_number,
        customer_name: inv.customer_name,
        worker_name: inv.worker_name || 'Online Store',
        quantity: item.quantity,
        selling_price: item.selling_price,
        item_total: item.item_total,
        date: inv.created_at,
      });
    }
  }

  const list = Object.values(stats).sort((a, b) => b.total_sold - a.total_sold);
  res.json(list);
});

// -------------------------------------------------------------
// CUSTOMERS & USERS
// -------------------------------------------------------------
// Fast Mobile Lookup for POS Billing & Checkout (User Request: number already register na name vanthurunum in billing system)
apiRouter.get('/customers/lookup', (req, res) => {
  const rawMobile = ((req.query.mobile as string) || '').replace(/\D/g, '');
  if (!rawMobile || rawMobile.length < 10) {
    return res.json({ found: false });
  }

  const cleanDigits = rawMobile.slice(-10);
  const db = dbService.getData();

  // 1. Check registered customers list
  const cust = db.customers.find((c) => {
    const cMobile = (c.mobile || '').replace(/\D/g, '');
    return cMobile.endsWith(cleanDigits) || cleanDigits.endsWith(cMobile);
  });

  if (
    cust &&
    cust.name &&
    cust.name.trim() !== '' &&
    cust.name !== 'Counter Walk-in Customer' &&
    cust.name !== 'Online Customer'
  ) {
    return res.json({
      found: true,
      name: cust.name,
      mobile: cust.mobile || rawMobile,
      address: cust.address || '',
      email: cust.email || '',
      total_orders: cust.total_orders || 1,
      source: 'customer_db',
    });
  }

  // 2. Check previous invoices for the most recent valid customer name
  const matchedInvoices = db.invoices.filter((inv) => {
    const invMobile = (inv.customer_mobile || '').replace(/\D/g, '');
    return invMobile.endsWith(cleanDigits) || cleanDigits.endsWith(invMobile);
  });

  if (matchedInvoices.length > 0) {
    matchedInvoices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const validInv = matchedInvoices.find(
      (inv) =>
        inv.customer_name &&
        inv.customer_name.trim() !== '' &&
        inv.customer_name.trim() !== 'Counter Walk-in Customer' &&
        inv.customer_name.trim() !== 'Online Customer'
    );
    if (validInv) {
      return res.json({
        found: true,
        name: validInv.customer_name,
        mobile: validInv.customer_mobile || rawMobile,
        address: validInv.customer_address || '',
        total_orders: matchedInvoices.length,
        source: 'invoice_history',
      });
    }
  }

  // 3. Check previous orders
  const matchedOrders = db.orders.filter((ord) => {
    const ordMobile = (ord.customer_mobile || '').replace(/\D/g, '');
    return ordMobile.endsWith(cleanDigits) || cleanDigits.endsWith(ordMobile);
  });

  if (matchedOrders.length > 0) {
    matchedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const validOrd = matchedOrders.find(
      (o) =>
        o.customer_name &&
        o.customer_name.trim() !== '' &&
        o.customer_name.trim() !== 'Counter Walk-in Customer' &&
        o.customer_name.trim() !== 'Online Customer'
    );
    if (validOrd) {
      return res.json({
        found: true,
        name: validOrd.customer_name,
        mobile: validOrd.customer_mobile || rawMobile,
        address: validOrd.customer_address || '',
        total_orders: matchedOrders.length,
        source: 'order_history',
      });
    }
  }

  return res.json({ found: false });
});

apiRouter.get('/customers', authMiddleware, (req, res) => {
  const db = dbService.getData();
  res.json(db.customers);
});

apiRouter.get('/customers/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = dbService.getData();
  const customer = db.customers.find((c) => c.id === id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const invoices = db.invoices.filter((inv) => inv.customer_mobile.replace(/\D/g, '') === customer.mobile.replace(/\D/g, ''));
  res.json({ customer, invoices });
});

apiRouter.get('/users', ownerOnlyMiddleware, (req, res) => {
  const db = dbService.getData();
  const userList = db.users.map((u) => {
    const bills = db.invoices.filter((i) => i.worker_id === u.id);
    const totalSales = bills.reduce((sum, i) => sum + i.grand_total, 0);
    return {
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      role: u.role,
      mobile: u.mobile,
      status: u.status,
      total_bills: bills.length,
      total_sales: totalSales,
      last_login: u.last_login,
      created_at: u.created_at,
    };
  });
  res.json(userList);
});

apiRouter.post('/users', ownerOnlyMiddleware, (req, res) => {
  const { name, username, password, role, mobile, email } = req.body;
  if (
    typeof name !== 'string' || !name.trim() ||
    typeof username !== 'string' || !username.trim() ||
    typeof password !== 'string' || !password.trim()
  ) {
    return res.status(400).json({ error: 'Name, username, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const db = dbService.getData();
  if (db.users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const auth = hashPassword(password);
  const id = db.users.length > 0 ? Math.max(...db.users.map((u) => u.id)) + 1 : 1;
  const newUser: User = {
    id,
    name: name.trim(),
    username: username.trim().toLowerCase(),
    email: email?.trim() || `${username.trim().toLowerCase()}@devarajcrackers.com`,
    password_hash: auth.hash,
    salt: auth.salt,
    role: (role as any) || 'WORKER',
    mobile: mobile?.trim() || '',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.users.push(newUser);
  dbService.saveSync();

  dbService.logActivity((req as any).user.name, 'USER_CREATED', `Created new user ${newUser.username} (${newUser.role})`, (req as any).user.id);
  res.json({
    success: true,
    id: newUser.id,
    name: newUser.name,
    username: newUser.username,
    role: newUser.role,
    status: newUser.status,
    mobile: newUser.mobile,
    email: newUser.email,
  });
});

apiRouter.put('/users/:id', ownerOnlyMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = dbService.getData();
  const user = db.users.find((u) => u.id === id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, mobile, email, status, role } = req.body;
  if (name !== undefined) user.name = name;
  if (mobile !== undefined) user.mobile = mobile;
  if (email !== undefined) user.email = email;
  if (status !== undefined) user.status = status;
  if (role !== undefined) user.role = role;
  user.updated_at = new Date().toISOString();

  dbService.saveSync();
  dbService.logActivity((req as any).user.name, 'USER_UPDATED', `Updated user details for ${user.username}`, (req as any).user.id);
  res.json({ success: true, user });
});

apiRouter.post('/users/:id/reset-password', ownerOnlyMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const db = dbService.getData();
  const user = db.users.find((u) => u.id === id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const auth = hashPassword(new_password);
  user.password_hash = auth.hash;
  user.salt = auth.salt;
  user.updated_at = new Date().toISOString();

  dbService.saveSync();
  dbService.logActivity((req as any).user.name, 'USER_PASSWORD_RESET', `Reset password for user ${user.username}`, (req as any).user.id);
  res.json({ success: true, message: `Password reset successfully for ${user.username}` });
});

apiRouter.delete('/users/:id', ownerOnlyMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (id === 1) {
    return res.status(400).json({ error: 'Cannot delete primary Owner account' });
  }

  const db = dbService.getData();
  const index = db.users.findIndex((u) => u.id === id);
  if (index === -1) return res.status(404).json({ error: 'User not found' });

  const deletedUser = db.users[index];
  db.users.splice(index, 1);
  dbService.saveSync();

  dbService.logActivity((req as any).user.name, 'USER_DELETED', `Deleted user ${deletedUser.username} (${deletedUser.role})`, (req as any).user.id);
  res.json({ success: true, message: `User ${deletedUser.username} deleted successfully` });
});

// -------------------------------------------------------------
// AUDIT & LOGS
// -------------------------------------------------------------
const getActivityLogs = (req: Request, res: Response) => {
  const db = dbService.getData();
  res.json(db.activity_logs);
};

apiRouter.get('/activity-logs', ownerOnlyMiddleware, getActivityLogs);
apiRouter.get('/logs/activity', ownerOnlyMiddleware, getActivityLogs);

const getWhatsAppLogs = (req: Request, res: Response) => {
  const db = dbService.getData();
  res.json(db.whatsapp_logs);
};

apiRouter.get('/whatsapp-logs', ownerOnlyMiddleware, getWhatsAppLogs);
apiRouter.get('/logs/whatsapp', ownerOnlyMiddleware, getWhatsAppLogs);

// -------------------------------------------------------------
// SETTINGS
// -------------------------------------------------------------
apiRouter.get('/settings', (req, res) => {
  const db = dbService.getData();
  res.json(db.settings);
});

apiRouter.put('/settings', ownerOnlyMiddleware, (req, res) => {
  const db = dbService.getData();
  db.settings = { ...db.settings, ...req.body };
  dbService.saveSync();
  dbService.logActivity((req as any).user.name, 'SETTINGS_UPDATED', 'Updated store settings', (req as any).user.id);
  res.json(db.settings);
});

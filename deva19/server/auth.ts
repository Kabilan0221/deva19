import crypto from 'crypto';
import { User, OTPVerification } from './types';

// Cryptographically secure password hashing using Node's native scrypt
export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

// Generate random 6-digit numeric OTP
export function generateNumericOTP(): string {
  const num = crypto.randomInt(100000, 999999);
  return num.toString();
}

export function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export function verifyOTP(enteredOtp: string, storedHash: string): boolean {
  const enteredHash = hashOTP(enteredOtp);
  return crypto.timingSafeEqual(Buffer.from(enteredHash, 'hex'), Buffer.from(storedHash, 'hex'));
}

// ---------------------------------------------------------------------------
// ADMIN RECOVERY KEY — a no-SMS, no-WhatsApp, no-third-party-service way to
// reset the OWNER/staff password if it's forgotten. This is a single secret
// phrase (set it in Vercel → Project → Settings → Environment Variables as
// ADMIN_RECOVERY_KEY) that stands in for OTP verification when SMS/MSG91
// hasn't been configured. Anyone who knows this phrase can reset any
// account's password, so keep it private — treat it like a master password.
//
// A default value ships so the feature works immediately without any setup,
// but you should override it via the ADMIN_RECOVERY_KEY env var before
// going live, and change it any time you suspect it has leaked.
// ---------------------------------------------------------------------------
const DEFAULT_RECOVERY_KEY = 'Devaraj@Recovery#2026';

export function getAdminRecoveryKey(): string {
  return process.env.ADMIN_RECOVERY_KEY || DEFAULT_RECOVERY_KEY;
}

export function verifyRecoveryKey(entered: string): boolean {
  const expected = getAdminRecoveryKey();
  const a = Buffer.from((entered || '').toString().trim());
  const b = Buffer.from(expected);
  // Lengths must match for timingSafeEqual; a length mismatch just means
  // "wrong key" rather than a crash.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Simple signed token for sessions
const SECRET = process.env.SESSION_SECRET || 'devaraj-crackers-super-secret-key-2026';

export function createSessionToken(user: User): string {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    timestamp: Date.now(),
  };
  const str = Buffer.from(JSON.stringify(payload)).toString('base64');
  const sig = crypto.createHmac('sha256', SECRET).update(str).digest('hex');
  return `${str}.${sig}`;
}

export function verifySessionToken(token: string): { id: number; username: string; role: 'OWNER' | 'WORKER'; name: string } | null {
  if (!token || !token.includes('.')) return null;
  const [str, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', SECRET).update(str).digest('hex');
  if (sig !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(str, 'base64').toString('utf-8'));
    // 7 days expiration
    if (Date.now() - payload.timestamp > 7 * 24 * 60 * 60 * 1000) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

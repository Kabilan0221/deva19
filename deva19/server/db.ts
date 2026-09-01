import fs from 'fs';
import path from 'path';
import { hashPassword } from './auth';
import { isKvConfigured, kvGet, kvSet } from './kv';
import {
  DatabaseSchema,
  User,
  Category,
  Product,
  Customer,
  Order,
  Invoice,
  Payment,
  StockTransaction,
  OTPVerification,
  WhatsAppLog,
  ActivityLog,
  StoreSettings,
} from './types';

// The bundled copy shipped with the deployment (read-only on Vercel, but
// always present so we can load seed/last-known data from it).
const BUNDLED_DATA_DIR = path.join(process.cwd(), 'data');
const BUNDLED_DB_FILE = path.join(BUNDLED_DATA_DIR, 'database.json');

// On Vercel (and any other read-only serverless filesystem), the only
// writable location is /tmp. process.env.VERCEL is set automatically by
// Vercel's build & runtime, so we use that to decide where writes should go.
const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const WRITABLE_DATA_DIR = IS_SERVERLESS ? path.join('/tmp', 'devaraj-data') : BUNDLED_DATA_DIR;
const WRITABLE_DB_FILE = path.join(WRITABLE_DATA_DIR, 'database.json');

// Single key under which the entire database is stored in the durable KV
// store (when configured) — see server/kv.ts.
const KV_DB_KEY = 'devaraj_crackers_database_v1';

function ensureDataDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Initial seed data generator
function getInitialSeedData(): DatabaseSchema {
  const ownerAuth = hashPassword('devaraj@123');
  const worker1Auth = hashPassword('worker@123');
  const worker2Auth = hashPassword('worker@123');

  const now = new Date().toISOString();

  const users: User[] = [
    {
      id: 1,
      name: 'R.S. Gopinath (உரிமை: R.S.கோபிநாத்)',
      username: 'owner',
      email: 'owner@devarajcrackers.com',
      password_hash: ownerAuth.hash,
      salt: ownerAuth.salt,
      role: 'OWNER',
      mobile: '8870929100',
      status: 'ACTIVE',
      last_login: now,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: now,
    },
    {
      id: 2,
      name: 'Senthil Kumar (Billing Counter 1)',
      username: 'worker1',
      email: 'senthil@devarajcrackers.com',
      password_hash: worker1Auth.hash,
      salt: worker1Auth.salt,
      role: 'WORKER',
      mobile: '9842100002',
      status: 'ACTIVE',
      last_login: now,
      created_at: '2026-01-05T00:00:00.000Z',
      updated_at: now,
    },
    {
      id: 3,
      name: 'Murugan Ramasamy (Billing Counter 2)',
      username: 'worker2',
      email: 'murugan@devarajcrackers.com',
      password_hash: worker2Auth.hash,
      salt: worker2Auth.salt,
      role: 'WORKER',
      mobile: '9842100003',
      status: 'ACTIVE',
      last_login: now,
      created_at: '2026-01-10T00:00:00.000Z',
      updated_at: now,
    },
  ];

  const categories: Category[] = [
    {
      id: 1,
      name: 'Single & Sound Crackers',
      slug: 'crackers',
      description: 'Traditional loud and crisp sound crackers direct from Sivakasi factory.',
      image_url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=400&q=80',
      display_order: 1,
      is_active: true,
      created_at: now,
    },
    {
      id: 2,
      name: 'Sparklers (கம்பி மத்தாப்பு)',
      slug: 'sparklers',
      description: 'Long-lasting, safe sparklers in electric, gold, red, and green colors.',
      image_url: 'https://images.unsplash.com/photo-1508963493744-76fce69379c0?auto=format&fit=crop&w=400&q=80',
      display_order: 2,
      is_active: true,
      created_at: now,
    },
    {
      id: 3,
      name: 'Flower Pots (பூந்தொட்டி)',
      slug: 'flower-pots',
      description: 'Dazzling high-rising shower sparks in small, big, asoka, and deluxe sizes.',
      image_url: 'https://images.unsplash.com/photo-1533230408708-8f9f91d1235a?auto=format&fit=crop&w=400&q=80',
      display_order: 3,
      is_active: true,
      created_at: now,
    },
    {
      id: 4,
      name: 'Ground Chakkarams (சக்கரம்)',
      slug: 'ground-chakkarams',
      description: 'Fast-spinning bright wheel fireworks for kids and family celebrations.',
      image_url: 'https://images.unsplash.com/photo-1576919228236-a097c32a5cd4?auto=format&fit=crop&w=400&q=80',
      display_order: 4,
      is_active: true,
      created_at: now,
    },
    {
      id: 5,
      name: 'Rockets (ராக்கெட்)',
      slug: 'rockets',
      description: 'High-speed sky soaring rockets with whistling sounds and starburst colors.',
      image_url: 'https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?auto=format&fit=crop&w=400&q=80',
      display_order: 5,
      is_active: true,
      created_at: now,
    },
    {
      id: 6,
      name: 'Fancy Items & Fountains',
      slug: 'fancy-items',
      description: 'Peacock feathers, water falls, magic color cones, and aerial novelties.',
      image_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=400&q=80',
      display_order: 6,
      is_active: true,
      created_at: now,
    },
    {
      id: 7,
      name: 'Bombs & Garlands',
      slug: 'bombs',
      description: 'Hydro bombs, atom bombs, king bombs, and classic 100 to 1000 wala garlands.',
      image_url: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=400&q=80',
      display_order: 7,
      is_active: true,
      created_at: now,
    },
    {
      id: 8,
      name: 'Family Gift Boxes',
      slug: 'gift-boxes',
      description: 'Mega assorted family festival boxes with 25 to 65 festive items.',
      image_url: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=400&q=80',
      display_order: 8,
      is_active: true,
      created_at: now,
    },
    {
      id: 9,
      name: 'Kids Specials',
      slug: 'kids-items',
      description: '100% safe pop pop snappers, serpent eggs, roll caps, and magic lights.',
      image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80',
      display_order: 9,
      is_active: true,
      created_at: now,
    },
    {
      id: 10,
      name: 'Multi Sky Shots (Aerial)',
      slug: 'sky-shots',
      description: 'Multi-shot display cakes (12, 25, 50, 100 shots) painting the sky with colors.',
      image_url: 'https://images.unsplash.com/photo-1533230408708-8f9f91d1235a?auto=format&fit=crop&w=400&q=80',
      display_order: 10,
      is_active: true,
      created_at: now,
    },
  ];

  const products: Product[] = [
    {
      id: 1,
      name: 'Flower Pot Big (பூந்தொட்டி பெரியது)',
      code: 'FP-BIG',
      barcode: '890123450001',
      category_id: 3,
      category_name: 'Flower Pots (பூந்தொட்டி)',
      description: 'High-height bright golden and silver shower with rich spark spread. 10 Pcs box.',
      mrp: 500,
      discount_percentage: 30,
      selling_price: 350,
      stock_quantity: 120,
      min_stock_alert: 25,
      is_active: true,
      image_url: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=500&q=80',
      created_at: now,
      updated_at: now,
    },
    {
      id: 2,
      name: 'Flower Pot Special Ashoka',
      code: 'FP-ASHOKA',
      barcode: '890123450002',
      category_id: 3,
      category_name: 'Flower Pots (பூந்தொட்டி)',
      description: 'Classic green & red sparkles rising up to 15 feet. 10 Pcs box.',
      mrp: 650,
      discount_percentage: 35,
      selling_price: 422,
      stock_quantity: 85,
      min_stock_alert: 20,
      is_active: true,
      image_url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=500&q=80',
      created_at: now,
      updated_at: now,
    },
    {
      id: 3,
      name: 'Ground Chakkaram Big (சக்கரம் பெரியது)',
      code: 'GC-BIG',
      barcode: '890123450003',
      category_id: 4,
      category_name: 'Ground Chakkarams (சக்கரம்)',
      description: 'Super-speed ground spinner with multi-colored rim sparks. 10 Pcs box.',
      mrp: 350,
      discount_percentage: 40,
      selling_price: 210,
      stock_quantity: 150,
      min_stock_alert: 30,
      is_active: true,
      image_url: 'https://images.unsplash.com/photo-1576919228236-a097c32a5cd4?auto=format&fit=crop&w=500&q=80',
      created_at: now,
      updated_at: now,
    },
    {
      id: 4,
      name: 'Chakkaram Special Deluxe (10 Pcs)',
      code: 'GC-DLX',
      barcode: '890123450004',
      category_id: 4,
      category_name: 'Ground Chakkarams (சக்கரம்)',
      description: 'Extra duration whistle wheel chakkaram with smooth spins.',
      mrp: 480,
      discount_percentage: 35,
      selling_price: 312,
      stock_quantity: 90,
      min_stock_alert: 20,
      is_active: true,
      image_url: 'https://images.unsplash.com/photo-1576919228236-a097c32a5cd4?auto=format&fit=crop&w=500&q=80',
      created_at: now,
      updated_at: now,
    },
    {
      id: 5,
      name: 'Electric Sparklers 15cm (மத்தாப்பு)',
      code: 'SPK-15CM',
      barcode: '890123450005',
      category_id: 2,
      category_name: 'Sparklers (கம்பி மத்தாப்பு)',
      description: 'Crisp bright electric sparklers. 10 Pcs per pack.',
      mrp: 120,
      discount_percentage: 40,
      selling_price: 72,
      stock_quantity: 240,
      min_stock_alert: 50,
      is_active: true,
      image_url: 'https://images.unsplash.com/photo-1508963493744-76fce69379c0?auto=format&fit=crop&w=500&q=80',
      created_at: now,
      updated_at: now,
    },
    {
      id: 6,
      name: 'Green & Red Colour Sparklers 30cm',
      code: 'SPK-30CM-COL',
      barcode: '890123450006',
      category_id: 2,
      category_name: 'Sparklers (கம்பி மத்தாப்பு)',
      description: 'Extra long 30cm emerald green & ruby red glittering sparklers. 5 Pcs box.',
      mrp: 260,
      discount_percentage: 35,
      selling_price: 169,
      stock_quantity: 110,
      min_stock_alert: 25,
      is_active: true,
      image_url: 'https://images.unsplash.com/photo-1508963493744-76fce69379c0?auto=format&fit=crop&w=500&q=80',
      created_at: now,
      updated_at: now,
    },
    {
      id: 7,
      name: 'Rocket Special Sound (ராக்கெட் சவுண்ட்)',
      code: 'RCK-SND',
      barcode: '890123450007',
      category_id: 5,
      category_name: 'Rockets (ராக்கெட்)',
      description: 'Soars high into the night sky with whistling trail and powerful blast. 10 Pcs box.',
      mrp: 380,
      discount_percentage: 30,
      selling_price: 266,
      stock_quantity: 65,
      min_stock_alert: 20,
      is_active: true,
      image_url: 'https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?auto=format&fit=crop&w=500&q=80',
      created_at: now,
      updated_at: now,
    },
    {
      id: 8,
      name: 'Colour Rocket Multi Star (கலர் ராக்கெட்)',
      code: 'RCK-COL',
      barcode: '890123450008',
      category_id: 5,
      category_name: 'Rockets (ராக்கெட்)',
      description: 'Sky bursting with 7 vibrant chromatic star parachutes. 10 Pcs box.',
      mrp: 450,
      discount_percentage: 30,
      selling_price: 315,
      stock_quantity: 45,
      min_stock_alert: 15,
      is_active: true,
      image_url: 'https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?auto=format&fit=crop&w=500&q=80',
      created_at: now,
      updated_at: now,
    },
    {
      id: 9,
      name: 'Hydro Bomb (ஹைட்ரோ பாம்)',
      code: 'BMB-HYD',
      barcode: '890123450009',
      category_id: 7,
      category_name: 'Bombs & Garlands',
      description: 'Heavy duty thunderous reverberating explosion bomb. 10 Pcs box.',
      mrp: 320,
      discount_percentage: 30,
      selling_price: 224,
      stock_quantity: 75,
      min_stock_alert: 20,
      is_active: true,
      image_url: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=500&q=80',
      created_at: now,
      updated_at: now,
    },
    {
      id: 10,
      name: 'Classic 2 3/4" Kuruvi Crackers (குருவி வெடி)',
      code: 'CRK-KUR',
      barcode: '890123450010',
      category_id: 1,
      category_name: 'Single & Sound Crackers',
      description: 'Pocket friendly high-frequency snappy sound crackers. 1 Packet (10 Pcs).',
      mrp: 40,
      discount_percentage: 25,
      selling_price: 30,
      stock_quantity: 300,
      min_stock_alert: 50,
      is_active: true,
      image_url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=500&q=80',
      created_at: now,
      updated_at: now,
    },
    {
      id: 11,
      name: '1000 Wala Deluxe Garland (1000 வெடி)',
      code: 'GRL-1000',
      barcode: '890123450011',
      category_id: 7,
      category_name: 'Bombs & Garlands',
      description: 'Grand nonstop continuous celebratory red cracker string for Diwali morning!',
      mrp: 1400,
      discount_percentage: 45,
      selling_price: 770,
      stock_quantity: 35,
      min_stock_alert: 10,
      is_active: true,
      image_url: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=500&q=80',
      created_at: now,
      updated_at: now,
    },
    {
      id: 12,
      name: 'Peacock Feather Dancing Fountain',
      code: 'FNC-PEA',
      barcode: '890123450012',
      category_id: 6,
      category_name: 'Fancy Items & Fountains',
      description: 'Magical peacock spray plume with glowing sapphire and emerald hues.',
      mrp: 520,
      discount_percentage: 30,
      selling_price: 364,
      stock_quantity: 40,
      min_stock_alert: 15,
      is_active: true,
      image_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=500&q=80',
      created_at: now,
      updated_at: now,
    },
    {
      id: 13,
      name: 'Devaraj Royal Family Gift Box (35 Items)',
      code: 'GB-ROYAL',
      barcode: '890123450013',
      category_id: 8,
      category_name: 'Family Gift Boxes',
      description: 'All-in-one family pack: Sparklers, Pots, Chakkars, Rockets, Ground bombs & Novelties.',
      mrp: 3500,
      discount_percentage: 50,
      selling_price: 1750,
      stock_quantity: 28,
      min_stock_alert: 8,
      is_active: true,
      image_url: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=500&q=80',
      created_at: now,
      updated_at: now,
    },
    {
      id: 14,
      name: 'Devaraj Mega Festival Box (55 Items)',
      code: 'GB-MEGA',
      barcode: '890123450014',
      category_id: 8,
      category_name: 'Family Gift Boxes',
      description: 'Grand Diwali celebration box loaded with premium aerial shots and classic crackers.',
      mrp: 6000,
      discount_percentage: 55,
      selling_price: 2700,
      stock_quantity: 15,
      min_stock_alert: 5,
      is_active: true,
      image_url: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=500&q=80',
      created_at: now,
      updated_at: now,
    },
    {
      id: 15,
      name: 'Kids Pop Pop Snappers (50 Pcs Box)',
      code: 'KID-POP',
      barcode: '890123450015',
      category_id: 9,
      category_name: 'Kids Specials',
      description: 'Throw down on ground for an instant snappy pop sound. 100% child-safe, no fire needed.',
      mrp: 100,
      discount_percentage: 30,
      selling_price: 70,
      stock_quantity: 180,
      min_stock_alert: 30,
      is_active: true,
      image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=500&q=80',
      created_at: now,
      updated_at: now,
    },
    {
      id: 16,
      name: '12 Shots Multi Colour Sky Cake',
      code: 'SKY-12',
      barcode: '890123450016',
      category_id: 10,
      category_name: 'Multi Sky Shots (Aerial)',
      description: 'Continuous 12 aerial explosions bursting into golden brocade crowns and red stars.',
      mrp: 900,
      discount_percentage: 35,
      selling_price: 585,
      stock_quantity: 50,
      min_stock_alert: 12,
      is_active: true,
      image_url: 'https://images.unsplash.com/photo-1533230408708-8f9f91d1235a?auto=format&fit=crop&w=500&q=80',
      created_at: now,
      updated_at: now,
    },
    {
      id: 17,
      name: '25 Shots Mega Multi Colour Sky Cake',
      code: 'SKY-25',
      barcode: '890123450017',
      category_id: 10,
      category_name: 'Multi Sky Shots (Aerial)',
      description: 'Spectacular 25 shots showstopper with crackling silver palms and golden willows.',
      mrp: 1800,
      discount_percentage: 40,
      selling_price: 1080,
      stock_quantity: 32,
      min_stock_alert: 10,
      is_active: true,
      image_url: 'https://images.unsplash.com/photo-1533230408708-8f9f91d1235a?auto=format&fit=crop&w=500&q=80',
      created_at: now,
      updated_at: now,
    },
  ];

  const customers: Customer[] = [
    {
      id: 1,
      name: 'Rajesh Kumar',
      mobile: '9876543210',
      email: 'rajesh@example.com',
      address: 'No 45, Anna Nagar 2nd Street',
      area: 'Anna Nagar',
      city: 'Madurai',
      pincode: '625020',
      total_orders: 2,
      total_purchase: 4250,
      last_order_date: '2026-08-27T14:20:00.000Z',
      created_at: '2026-08-15T10:00:00.000Z',
      updated_at: now,
    },
    {
      id: 2,
      name: 'Anand Padmanabhan',
      mobile: '9443219876',
      email: 'anand@example.com',
      address: 'Plot 12, Gandhi Road, Fairlands',
      area: 'Fairlands',
      city: 'Salem',
      pincode: '636016',
      total_orders: 1,
      total_purchase: 1750,
      last_order_date: '2026-08-28T09:15:00.000Z',
      created_at: '2026-08-28T09:00:00.000Z',
      updated_at: now,
    },
    {
      id: 3,
      name: 'Suresh Babu',
      mobile: '9841029384',
      email: 'suresh@example.com',
      address: '78 West Masi Street',
      area: 'Central',
      city: 'Madurai',
      pincode: '625001',
      total_orders: 1,
      total_purchase: 850,
      last_order_date: '2026-08-28T10:30:00.000Z',
      created_at: '2026-08-28T10:20:00.000Z',
      updated_at: now,
    },
  ];

  const orders: Order[] = [
    {
      id: 1,
      order_number: 'ORD-2026-000001',
      invoice_number: 'INV-2026-000001',
      customer_id: 1,
      customer_name: 'Rajesh Kumar',
      customer_mobile: '9876543210',
      customer_email: 'rajesh@example.com',
      customer_address: 'No 45, Anna Nagar 2nd Street, Madurai - 625020',
      subtotal: 2900,
      discount: 400,
      grand_total: 2500,
      status: 'CONFIRMED',
      order_source: 'CUSTOMER_WEBSITE',
      payment_mode: 'ONLINE',
      notes: 'Please pack securely in waterproof box.',
      items: [
        {
          id: 1,
          order_id: 1,
          product_id: 1,
          product_name: 'Flower Pot Big (பூந்தொட்டி பெரியது)',
          mrp: 500,
          discount_percentage: 30,
          selling_price: 350,
          quantity: 2,
          item_total: 700,
        },
        {
          id: 2,
          order_id: 1,
          product_id: 13,
          product_name: 'Devaraj Royal Family Gift Box (35 Items)',
          mrp: 3500,
          discount_percentage: 50,
          selling_price: 1750,
          quantity: 1,
          item_total: 1750,
        },
        {
          id: 3,
          order_id: 1,
          product_id: 5,
          product_name: 'Electric Sparklers 15cm (மத்தாப்பு)',
          mrp: 120,
          discount_percentage: 40,
          selling_price: 72,
          quantity: 1,
          item_total: 72,
        },
      ],
      created_at: '2026-08-27T14:20:00.000Z',
      updated_at: '2026-08-27T14:20:00.000Z',
    },
    {
      id: 2,
      order_number: 'ORD-2026-000002',
      invoice_number: 'INV-2026-000002',
      customer_id: 2,
      customer_name: 'Anand Padmanabhan',
      customer_mobile: '9443219876',
      customer_email: 'anand@example.com',
      customer_address: 'Plot 12, Gandhi Road, Fairlands, Salem - 636016',
      subtotal: 1900,
      discount: 150,
      grand_total: 1750,
      status: 'CONFIRMED',
      order_source: 'WORKER_POS',
      worker_id: 2,
      worker_name: 'Senthil Kumar (Billing Counter 1)',
      payment_mode: 'CASH',
      notes: 'Counter Walk-in Sale',
      items: [
        {
          id: 4,
          order_id: 2,
          product_id: 13,
          product_name: 'Devaraj Royal Family Gift Box (35 Items)',
          mrp: 3500,
          discount_percentage: 50,
          selling_price: 1750,
          quantity: 1,
          item_total: 1750,
        },
      ],
      created_at: '2026-08-28T09:15:00.000Z',
      updated_at: '2026-08-28T09:15:00.000Z',
    },
    {
      id: 3,
      order_number: 'ORD-2026-000003',
      invoice_number: 'INV-2026-000003',
      customer_id: 3,
      customer_name: 'Suresh Babu',
      customer_mobile: '9841029384',
      customer_email: 'suresh@example.com',
      customer_address: '78 West Masi Street, Madurai - 625001',
      subtotal: 950,
      discount: 100,
      grand_total: 850,
      status: 'CONFIRMED',
      order_source: 'WORKER_POS',
      worker_id: 3,
      worker_name: 'Murugan Ramasamy (Billing Counter 2)',
      payment_mode: 'UPI',
      notes: 'GPay payment received',
      items: [
        {
          id: 5,
          order_id: 3,
          product_id: 1,
          product_name: 'Flower Pot Big (பூந்தொட்டி பெரியது)',
          mrp: 500,
          discount_percentage: 30,
          selling_price: 350,
          quantity: 1,
          item_total: 350,
        },
        {
          id: 6,
          order_id: 3,
          product_id: 7,
          product_name: 'Rocket Special Sound (ராக்கெட் சவுண்ட்)',
          mrp: 380,
          discount_percentage: 30,
          selling_price: 266,
          quantity: 1,
          item_total: 266,
        },
        {
          id: 7,
          order_id: 3,
          product_id: 9,
          product_name: 'Hydro Bomb (ஹைட்ரோ பாம்)',
          mrp: 320,
          discount_percentage: 30,
          selling_price: 224,
          quantity: 1,
          item_total: 224,
        },
      ],
      created_at: '2026-08-28T10:30:00.000Z',
      updated_at: '2026-08-28T10:30:00.000Z',
    },
  ];

  const invoices: Invoice[] = [
    {
      id: 1,
      invoice_number: 'INV-2026-000001',
      order_id: 1,
      customer_name: 'Rajesh Kumar',
      customer_mobile: '9876543210',
      customer_address: 'No 45, Anna Nagar 2nd Street, Madurai - 625020',
      subtotal: 2900,
      discount: 400,
      grand_total: 2500,
      payment_mode: 'ONLINE',
      order_source: 'CUSTOMER_WEBSITE',
      status: 'PAID',
      whatsapp_status: 'DELIVERED',
      items: [
        {
          id: 1,
          invoice_id: 1,
          product_id: 1,
          product_name: 'Flower Pot Big (பூந்தொட்டி பெரியது)',
          mrp: 500,
          discount: 150,
          selling_price: 350,
          quantity: 2,
          item_total: 700,
        },
        {
          id: 2,
          invoice_id: 1,
          product_id: 13,
          product_name: 'Devaraj Royal Family Gift Box (35 Items)',
          mrp: 3500,
          discount: 1750,
          selling_price: 1750,
          quantity: 1,
          item_total: 1750,
        },
        {
          id: 3,
          invoice_id: 1,
          product_id: 5,
          product_name: 'Electric Sparklers 15cm (மத்தாப்பு)',
          mrp: 120,
          discount: 48,
          selling_price: 72,
          quantity: 1,
          item_total: 72,
        },
      ],
      created_at: '2026-08-27T14:20:00.000Z',
    },
    {
      id: 2,
      invoice_number: 'INV-2026-000002',
      order_id: 2,
      customer_name: 'Anand Padmanabhan',
      customer_mobile: '9443219876',
      customer_address: 'Plot 12, Gandhi Road, Fairlands, Salem - 636016',
      subtotal: 1900,
      discount: 150,
      grand_total: 1750,
      payment_mode: 'CASH',
      order_source: 'WORKER_POS',
      worker_id: 2,
      worker_name: 'Senthil Kumar (Billing Counter 1)',
      status: 'PAID',
      whatsapp_status: 'SENT',
      items: [
        {
          id: 4,
          invoice_id: 2,
          product_id: 13,
          product_name: 'Devaraj Royal Family Gift Box (35 Items)',
          mrp: 3500,
          discount: 1750,
          selling_price: 1750,
          quantity: 1,
          item_total: 1750,
        },
      ],
      created_at: '2026-08-28T09:15:00.000Z',
    },
    {
      id: 3,
      invoice_number: 'INV-2026-000003',
      order_id: 3,
      customer_name: 'Suresh Babu',
      customer_mobile: '9841029384',
      customer_address: '78 West Masi Street, Madurai - 625001',
      subtotal: 950,
      discount: 100,
      grand_total: 850,
      payment_mode: 'UPI',
      order_source: 'WORKER_POS',
      worker_id: 3,
      worker_name: 'Murugan Ramasamy (Billing Counter 2)',
      status: 'PAID',
      whatsapp_status: 'DELIVERED',
      items: [
        {
          id: 5,
          invoice_id: 3,
          product_id: 1,
          product_name: 'Flower Pot Big (பூந்தொட்டி பெரியது)',
          mrp: 500,
          discount: 150,
          selling_price: 350,
          quantity: 1,
          item_total: 350,
        },
        {
          id: 6,
          invoice_id: 3,
          product_id: 7,
          product_name: 'Rocket Special Sound (ராக்கெட் சவுண்ட்)',
          mrp: 380,
          discount: 114,
          selling_price: 266,
          quantity: 1,
          item_total: 266,
        },
        {
          id: 7,
          invoice_id: 3,
          product_id: 9,
          product_name: 'Hydro Bomb (ஹைட்ரோ பாம்)',
          mrp: 320,
          discount: 96,
          selling_price: 224,
          quantity: 1,
          item_total: 224,
        },
      ],
      created_at: '2026-08-28T10:30:00.000Z',
    },
  ];

  const payments: Payment[] = [
    {
      id: 1,
      invoice_id: 1,
      order_id: 1,
      amount: 2500,
      payment_mode: 'ONLINE',
      transaction_ref: 'ONL_TXN_881920',
      status: 'COMPLETED',
      created_at: '2026-08-27T14:20:00.000Z',
    },
    {
      id: 2,
      invoice_id: 2,
      order_id: 2,
      amount: 1750,
      payment_mode: 'CASH',
      transaction_ref: 'CASH_REC_002',
      status: 'COMPLETED',
      created_at: '2026-08-28T09:15:00.000Z',
    },
    {
      id: 3,
      invoice_id: 3,
      order_id: 3,
      amount: 850,
      payment_mode: 'UPI',
      transaction_ref: 'UPI_REF_9918237',
      status: 'COMPLETED',
      created_at: '2026-08-28T10:30:00.000Z',
    },
  ];

  const stock_transactions: StockTransaction[] = [
    {
      id: 1,
      product_id: 1,
      product_name: 'Flower Pot Big (பூந்தொட்டி பெரியது)',
      transaction_type: 'STOCK_ADDED',
      quantity: 150,
      previous_stock: 0,
      new_stock: 150,
      user_id: 1,
      user_name: 'Devaraj Shanmugam (Proprietor)',
      notes: 'Initial factory batch loading',
      created_at: '2026-08-01T08:00:00.000Z',
    },
    {
      id: 2,
      product_id: 13,
      product_name: 'Devaraj Royal Family Gift Box (35 Items)',
      transaction_type: 'STOCK_ADDED',
      quantity: 50,
      previous_stock: 0,
      new_stock: 50,
      user_id: 1,
      user_name: 'Devaraj Shanmugam (Proprietor)',
      notes: 'Diwali pre-booking shipment',
      created_at: '2026-08-01T08:00:00.000Z',
    },
    {
      id: 3,
      product_id: 1,
      product_name: 'Flower Pot Big (பூந்தொட்டி பெரியது)',
      transaction_type: 'SALE',
      quantity: 2,
      previous_stock: 150,
      new_stock: 148,
      invoice_number: 'INV-2026-000001',
      notes: 'Customer website order',
      created_at: '2026-08-27T14:20:00.000Z',
    },
  ];

  const whatsapp_logs: WhatsAppLog[] = [
    {
      id: 1,
      recipient_type: 'OWNER',
      recipient_phone: '919842100000',
      invoice_number: 'INV-2026-000001',
      invoice_id: 1,
      message: 'New Order Received! Invoice: INV-2026-000001 | Customer: Rajesh Kumar | Total: ₹2,500 | Items: 3. Invoice PDF attached.',
      status: 'DELIVERED',
      api_response: '{"messaging_product":"whatsapp","contacts":[{"input":"919842100000","wa_id":"919842100000"}],"messages":[{"id":"wamid.HBgLOTE5ODQyMTAwMDAwFQIAERgSMzc5QjM5"}]}',
      created_at: '2026-08-27T14:20:05.000Z',
    },
    {
      id: 2,
      recipient_type: 'OWNER',
      recipient_phone: '919842100000',
      invoice_number: 'INV-2026-000002',
      invoice_id: 2,
      message: 'New POS Bill! Invoice: INV-2026-000002 | Worker: Senthil Kumar | Customer: Anand Padmanabhan | Total: ₹1,750 | Payment: CASH',
      status: 'SENT',
      api_response: '{"messaging_product":"whatsapp","messages":[{"id":"wamid.HBgLOTE5ODQyMTAwMDAwFQIAERgSODE3NzY1"}]}',
      created_at: '2026-08-28T09:15:05.000Z',
    },
  ];

  const activity_logs: ActivityLog[] = [
    {
      id: 1,
      user_id: 1,
      user_name: 'Devaraj Shanmugam (Proprietor)',
      action: 'SYSTEM_INITIALIZATION',
      details: 'Devaraj Crackers Database & Store configuration initialized.',
      ip_address: '127.0.0.1',
      created_at: '2026-08-01T08:00:00.000Z',
    },
    {
      id: 2,
      user_id: 1,
      user_name: 'Devaraj Shanmugam (Proprietor)',
      action: 'STOCK_ADDED',
      details: 'Added factory batches for Flower Pots and Gift Boxes.',
      ip_address: '127.0.0.1',
      created_at: '2026-08-01T08:05:00.000Z',
    },
    {
      id: 3,
      user_name: 'Rajesh Kumar (Customer)',
      action: 'WEBSITE_ORDER_PLACED',
      details: 'Created Invoice INV-2026-000001 for ₹2,500.',
      related_record: 'INV-2026-000001',
      created_at: '2026-08-27T14:20:00.000Z',
    },
    {
      id: 4,
      user_id: 2,
      user_name: 'Senthil Kumar (Billing Counter 1)',
      action: 'POS_BILL_CREATED',
      details: 'Created POS Bill INV-2026-000002 for ₹1,750. Payment: CASH',
      related_record: 'INV-2026-000002',
      created_at: '2026-08-28T09:15:00.000Z',
    },
  ];

  const settings: StoreSettings = {
    shop_name: 'DJ DEVARAJ CRACKERS (தேவராஜ் பட்டாசு கடை)',
    shop_tamil_name: 'தேவராஜ் பட்டாசு கடை',
    shop_english_name: 'DJ DEVARAJ CRACKERS',
    proprietor_name: 'R.S.கோபிநாத் (R.S. Gopinath)',
    tagline: 'எங்களிடம் அனைத்து சுபநிகழ்ச்சிகளுக்கும் மொத்தமாகவும் சில்லரையாகவும் பட்டாசுகள் கிடைக்கும்!',
    address: 'நெ.27, கீழ்கதிர்பூர் புதிய பைபாஸ், நயாரா பெட்ரோல் பங்க் எதிரில், காஞ்சிபுரம் - 631 502.',
    city: 'காஞ்சிபுரம் (Kanchipuram)',
    pincode: '631502',
    state: 'Tamil Nadu',
    contact_number: '+91 98947 77176',
    contact_number_alt: '+91 94444 15380',
    owner_whatsapp: '919894777176',
    gst_number: '33AAACD9981E1Z5',
    invoice_prefix: 'DJ-INV-',
    min_order_value: 500,
    min_order_by_state: {
      'Tamil Nadu': 3000,
      Karnataka: 5000,
      'Andhra Pradesh': 5000,
      Telangana: 5000,
    },
    free_delivery_above: 3000,
    announcement: '💥 DJ DEVARAJ CRACKERS - நேரடி சிவகாசி தரமான பசுமை பட்டாசுகள்! 90% அதிரடி தள்ளுபடி விற்பனை! காஞ்சிபுரம்.',
    bank_name: 'State Bank of India - Kanchipuram Branch',
    bank_upi_id: '8870929100@upi',
    bank_account_no: '3948271049281',
    bank_ifsc: 'SBIN0000853',
    banners: [
      {
        id: 'banner-1',
        title: 'DJ DEVARAJ CRACKERS - Kanchipuram Grand Diwali Sale',
        tamil_title: 'DJ DEVARAJ CRACKERS - தீபாவளி அதிரடி தள்ளுபடி விற்பனை!',
        subtitle: 'Direct Sivakasi Factory Fresh Crackers with up to 90% discount on all varieties.',
        tamil_subtitle: 'சிவகாசி நேரடி தொழிற்சாலை விலையில் 90% வரை தள்ளுபடி! மொத்தமாகவும் சில்லரையாகவும் கிடைக்கும்.',
        image_url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1400&q=80',
        badge: '💥 90% SPECIAL DISCOUNT',
      },
      {
        id: 'banner-2',
        title: 'Family Combo Gift Boxes & Kids Special Sparklers',
        tamil_title: 'குடும்ப தீபாவளி கிப்ட் பாக்ஸ் & வண்ண வண்ண மத்தாப்புகள்',
        subtitle: 'Pre-assembled safe green fireworks gift boxes for unforgettable family moments.',
        tamil_subtitle: 'குழந்தைகள் மற்றும் குடும்பத்தினருக்கான பிரத்யேக கிப்ட் பாக்ஸ்கள் & பூந்தொட்டிகள்.',
        image_url: 'https://images.unsplash.com/photo-1508963493744-76fce69379c0?auto=format&fit=crop&w=1400&q=80',
        badge: '🎁 FAMILY COMBO PACKS',
      },
      {
        id: 'banner-3',
        title: 'Sky Repeaters, Flower Pots & Whistling Rockets',
        tamil_title: 'வானவேடிக்கை 30-ஷாட்ஸ், பூந்தொட்டி மற்றும் ராக்கெட்டுகள்',
        subtitle: 'Dazzling aerial fireworks and high-sparkling showers at lowest wholesale prices.',
        tamil_subtitle: 'வானை அதிர வைக்கும் பிரம்மாண்ட வாணவேடிக்கை மற்றும் வண்ணமயமான மத்தாப்புகள்.',
        image_url: 'https://images.unsplash.com/photo-1533230408708-8f9f91d1235a?auto=format&fit=crop&w=1400&q=80',
        badge: '✨ SIVAKASI DIRECT WHOLESALE',
      },
    ],
  };

  return {
    users,
    categories,
    products,
    customers,
    customer_addresses: [],
    orders,
    invoices,
    payments,
    stock_transactions,
    otp_verifications: [],
    whatsapp_logs,
    activity_logs,
    settings,
  };
}

class DatabaseService {
  private db: DatabaseSchema;
  private isSaving = false;
  // In-flight promise for the current durable (KV) write, if any. Route
  // handlers await this (via flushPending) right before sending their
  // response, so the write has actually completed before Vercel is allowed
  // to freeze/terminate the function — otherwise a fire-and-forget write
  // could get silently dropped.
  private kvSavePromise: Promise<void> | null = null;
  // Ensures we only attempt to load persisted state from KV once per warm
  // instance, and lets every request await the same in-flight load.
  private kvLoadPromise: Promise<void> | null = null;

  constructor() {
    // ALWAYS start from a safe, pure in-memory seed. Nothing below this line
    // is allowed to leave `this.db` unset, no matter what the filesystem does -
    // that guarantee is what stops a read-only/missing filesystem (e.g. Vercel's
    // serverless functions) from crashing the whole API on import (which is what
    // previously surfaced as "HTTP error 500" on every request, including login).
    this.db = getInitialSeedData();

    // Try to recover a previously-persisted state (warm serverless instance,
    // or a normal long-lived server). /tmp on Vercel survives only for the
    // lifetime of a single warm function instance, so this is a best-effort
    // restore, not a durable database on its own — the durable copy lives in
    // KV (see ensureLoaded/persistToKv below) when KV_REST_API_URL /
    // UPSTASH_REDIS_REST_URL is configured.
    try {
      const savedFile = fs.existsSync(WRITABLE_DB_FILE)
        ? WRITABLE_DB_FILE
        : (fs.existsSync(BUNDLED_DB_FILE) ? BUNDLED_DB_FILE : null);

      if (savedFile) {
        const raw = fs.readFileSync(savedFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.products)) {
          this.db = parsed;
        }
      }
    } catch (err) {
      console.error('Could not read persisted database, continuing with in-memory seed data:', err);
    }

    if (!this.db.settings?.banners || !Array.isArray(this.db.settings.banners) || this.db.settings.banners.length === 0) {
      this.db.settings.banners = getInitialSeedData().settings.banners;
    }

    // Best-effort write so a warm serverless instance can recover this state
    // later. Failure here (e.g. fully read-only sandbox) is non-fatal.
    this.saveSync();
  }

  // Call this before reading/writing db state on every request (routes.ts
  // does this in a top-level middleware). On the FIRST request of a cold
  // start, this pulls the latest durable snapshot from KV (if configured)
  // so we don't serve/operate on stale seed data. On every later request in
  // the same warm instance it's a no-op (the promise is already resolved).
  public async ensureLoaded(): Promise<void> {
    if (!isKvConfigured()) return;
    if (!this.kvLoadPromise) {
      this.kvLoadPromise = (async () => {
        try {
          const raw = await kvGet(KV_DB_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.products)) {
              this.db = parsed;
            }
          }
        } catch (err) {
          console.error('Could not load persisted database from KV, keeping current in-memory state:', err);
        }
      })();
    }
    await this.kvLoadPromise;
  }

  // Awaited by routes.ts right before every response is sent, so a durable
  // write kicked off by saveSync() is guaranteed to finish first.
  public async flushPending(): Promise<void> {
    if (this.kvSavePromise) {
      try {
        await this.kvSavePromise;
      } catch {
        // persistToKv() already logs; never let a storage hiccup break the
        // response that triggered it.
      }
    }
  }

  public saveSync(): void {
    try {
      ensureDataDir(WRITABLE_DATA_DIR);
      const tmpFile = `${WRITABLE_DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.db, null, 2), 'utf-8');
      fs.renameSync(tmpFile, WRITABLE_DB_FILE);
    } catch (err) {
      // Never let a storage failure break the request that triggered it
      // (e.g. login updating last_login, or an order being placed).
      console.error('Database write error (state kept in-memory for this instance):', err);
    }

    // Kick off (but don't block here on) the durable KV write. routes.ts
    // awaits flushPending() right before sending the response, which is
    // what actually guarantees this completes.
    if (isKvConfigured()) {
      const snapshot = JSON.stringify(this.db);
      this.kvSavePromise = kvSet(KV_DB_KEY, snapshot)
        .then((ok) => {
          if (!ok) console.error('Database KV write did not succeed.');
        })
        .catch((err) => {
          console.error('Database KV write error:', err);
        });
    }
  }

  public getData(): DatabaseSchema {
    return this.db;
  }

  // Activity Log
  public logActivity(userName: string, action: string, details: string, userId?: number, relatedRecord?: string, ip?: string) {
    const id = this.db.activity_logs.length > 0 ? Math.max(...this.db.activity_logs.map(l => l.id)) + 1 : 1;
    const log: ActivityLog = {
      id,
      user_id: userId,
      user_name: userName,
      action,
      details,
      related_record: relatedRecord,
      ip_address: ip || '127.0.0.1',
      created_at: new Date().toISOString(),
    };
    this.db.activity_logs.unshift(log);
    // Keep max 500 logs
    if (this.db.activity_logs.length > 500) {
      this.db.activity_logs = this.db.activity_logs.slice(0, 500);
    }
    this.saveSync();
    return log;
  }

  // Next Invoice Number
  public generateNextInvoiceNumber(): string {
    const prefix = this.db.settings.invoice_prefix || 'INV-2026-';
    let maxNum = 3; // From pre-seeds
    for (const inv of this.db.invoices) {
      const match = inv.invoice_number.match(/(\d+)$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const next = maxNum + 1;
    return `${prefix}${next.toString().padStart(6, '0')}`;
  }

  public generateNextOrderNumber(): string {
    let maxNum = 3;
    for (const ord of this.db.orders) {
      const match = ord.order_number.match(/(\d+)$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const next = maxNum + 1;
    return `ORD-2026-${next.toString().padStart(6, '0')}`;
  }
}

export const dbService = new DatabaseService();
export default dbService;

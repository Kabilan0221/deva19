export type Role = 'OWNER' | 'WORKER';

export type OrderSource = 'CUSTOMER_WEBSITE' | 'WORKER_POS';

export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'ONLINE' | 'OTHER';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';

export type StockStatus = 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export type StockTransactionType = 'STOCK_ADDED' | 'SALE' | 'STOCK_ADJUSTMENT' | 'RETURN';

export type WhatsAppStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  code: string;
  barcode: string;
  category_id: number;
  category_name?: string;
  content?: string;
  description: string;
  mrp: number;
  discount_percentage: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_alert: number;
  is_active: boolean;
  image_url: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Customer {
  id: number;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  area?: string;
  city?: string;
  pincode?: string;
  total_orders: number;
  total_purchase: number;
  last_order_date?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  mrp: number;
  discount_percentage: number;
  selling_price: number;
  quantity: number;
  item_total: number;
}

export interface Order {
  id: number;
  order_number: string;
  invoice_number: string;
  customer_id: number;
  customer_name: string;
  customer_mobile: string;
  customer_email?: string;
  customer_address: string;
  subtotal: number;
  discount: number;
  grand_total: number;
  status: OrderStatus;
  order_source: OrderSource;
  worker_id?: number;
  worker_name?: string;
  payment_mode: PaymentMode;
  notes?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  product_id: number;
  product_name: string;
  mrp: number;
  discount: number;
  selling_price: number;
  quantity: number;
  item_total: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  order_id: number;
  customer_name: string;
  customer_mobile: string;
  customer_address: string;
  subtotal: number;
  discount: number;
  grand_total: number;
  payment_mode: PaymentMode;
  order_source: OrderSource;
  worker_id?: number;
  worker_name?: string;
  status: 'PAID' | 'PENDING' | 'CANCELLED';
  transaction_id?: string;
  notes?: string;
  items: InvoiceItem[];
  whatsapp_status: WhatsAppStatus;
  created_at: string;
}

export interface StockTransaction {
  id: number;
  product_id: number;
  product_name: string;
  transaction_type: StockTransactionType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  user_id?: number;
  user_name?: string;
  invoice_number?: string;
  notes?: string;
  created_at: string;
}

export interface UserSummary {
  id: number;
  name: string;
  username: string;
  email: string;
  role: Role;
  mobile: string;
  status: 'ACTIVE' | 'DISABLED';
  total_bills?: number;
  total_sales?: number;
  last_login?: string;
  created_at: string;
}

export interface DashboardMetrics {
  today_sales: number;
  yesterday_sales?: number;
  this_month_sales?: number;
  this_month_bills?: number;
  total_sales: number;
  total_bills: number;
  total_customers: number;
  hand_cash: number;
  online_sales: number;
  total_products: number;
  low_stock: number;
  out_of_stock: number;
  total_workers: number;
}

export interface WorkerReportItem {
  worker_id: number;
  name: string;
  username: string;
  mobile: string;
  bills_count: number;
  total_sales: number;
  cash_collected: number;
  online_collected: number;
  total_items_sold: number;
  bills: Invoice[];
}

export interface PaymentReportItem {
  mode: PaymentMode;
  count: number;
  total: number;
}

export interface ProductReportItem {
  product_id: number;
  product_name: string;
  total_sold: number;
  total_revenue: number;
  sales: {
    invoice_number: string;
    customer_name: string;
    worker_name: string;
    quantity: number;
    selling_price: number;
    item_total: number;
    date: string;
  }[];
}

export interface ActivityLog {
  id: number;
  user_id?: number;
  user_name: string;
  action: string;
  details: string;
  ip_address?: string;
  related_record?: string;
  created_at: string;
}

export interface WhatsAppLog {
  id: number;
  recipient_type: 'OWNER' | 'CUSTOMER';
  recipient_phone: string;
  invoice_number: string;
  invoice_id: number;
  message: string;
  status: WhatsAppStatus;
  api_response: string;
  created_at: string;
}

export interface BannerItem {
  id: string;
  title: string;
  tamil_title?: string;
  subtitle?: string;
  tamil_subtitle?: string;
  image_url: string;
  badge?: string;
  tag?: string;
  button_text?: string;
  button_link?: string;
  is_active?: boolean;
  display_order?: number;
}

export interface StoreSettings {
  shop_name: string;
  shop_tamil_name?: string;
  shop_english_name?: string;
  proprietor_name?: string;
  tagline: string;
  address: string;
  city: string;
  pincode: string;
  state: string;
  contact_number: string;
  contact_number_alt?: string;
  owner_whatsapp: string;
  gst_number: string;
  invoice_prefix: string;
  min_order_value: number;
  free_delivery_above: number;
  announcement: string;
  bank_name: string;
  bank_upi_id: string;
  upi_id?: string;
  bank_account_no: string;
  bank_ifsc: string;
  banners?: BannerItem[];
}

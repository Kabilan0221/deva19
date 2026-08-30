import { Invoice, StoreSettings } from '../types';

/**
 * Builds a formatted WhatsApp message with full bill details, itemized breakdown,
 * savings, and shop contact for instant customer sharing.
 */
export function buildInvoiceWhatsAppMessage(invoice: Invoice, settings?: StoreSettings | null): string {
  const shopName = settings?.shop_name || 'DEVARAJ TRADERS (தேவராஜ் பட்டாசு கடை)';
  const shopPhone = settings?.owner_whatsapp || '8870929100';
  const dateStr = new Date(invoice.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const onlineBillUrl = `${originUrl}?track=${invoice.invoice_number}`;

  let message = `💥 *${shopName}* 💥\n`;
  message += `📍 29, Sengalaneerodai Street, Kanchipuram\n`;
  message += `📞 *Contact / WhatsApp:* ${shopPhone}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🧾 *OFFICIAL CASH BILL & TAX INVOICE*\n`;
  message += `📋 *Invoice No:* #${invoice.invoice_number}\n`;
  message += `📅 *Date:* ${dateStr}\n`;
  message += `👤 *Customer:* ${invoice.customer_name || 'Counter Customer'}\n`;
  if (invoice.customer_mobile && invoice.customer_mobile !== 'Walk-in') {
    message += `📱 *Mobile:* ${invoice.customer_mobile}\n`;
  }
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `*ORDER BREAKDOWN (வாங்கிய பட்டாசுகள்):*\n\n`;

  invoice.items.forEach((item, index) => {
    message += `${index + 1}. *${item.product_name}*\n`;
    message += `   └ ${item.quantity} Qty × ₹${item.selling_price} (MRP: ₹${item.mrp}) = *₹${item.item_total}*\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💵 *Total MRP:* ₹${(invoice.subtotal || invoice.grand_total).toLocaleString('en-IN')}\n`;
  if (invoice.discount && invoice.discount > 0) {
    message += `🎉 *Diwali Special Discount:* -₹${invoice.discount.toLocaleString('en-IN')}\n`;
  }
  message += `🔥 *Net Payable Amount: ₹${invoice.grand_total.toLocaleString('en-IN')}*\n`;
  message += `💳 *Payment Mode:* ${invoice.payment_mode || 'CASH'}\n`;
  if (invoice.transaction_id) {
    message += `🔢 *Txn ID / Ref:* ${invoice.transaction_id}\n`;
  }
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🔗 *View / Download E-Bill Online:*\n${onlineBillUrl}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `✨ தேவராஜ் பட்டாசு கடைக்கு வருகை தந்தமைக்கு மிக்க நன்றி! இனிய தீபாவளி நல்வாழ்த்துகள்! 🪔✨\n`;
  message += `📞 ஆர்டர் & தொடர்புக்கு: ${shopPhone}`;

  return message;
}

/**
 * Open WhatsApp with pre-filled invoice message
 */
export function sendInvoiceViaWhatsApp(invoice: Invoice, settings?: StoreSettings | null, targetPhone?: string) {
  const message = buildInvoiceWhatsAppMessage(invoice, settings);
  const rawPhone = targetPhone || invoice.customer_mobile || settings?.owner_whatsapp || '8870929100';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const url = formattedPhone && formattedPhone.length >= 10
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

  window.open(url, '_blank');
}


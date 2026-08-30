import { WhatsAppLog, WhatsAppStatus, Invoice } from './types';
import dbService from './db';
import { generateInvoicePDF } from '../src/utils/pdfGenerator';

// Set to true only when real Meta WhatsApp Cloud API credentials
// (WHATSAPP_API_TOKEN + WHATSAPP_PHONE_NUMBER_ID) are configured in env vars.
export function isWhatsAppCloudApiConfigured(): boolean {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return !!token && !!phoneNumberId && token !== 'YOUR_WHATSAPP_CLOUD_API_TOKEN';
}

/**
 * Sends a plain WhatsApp text message via the Meta Cloud API to a given
 * mobile number. Used for OTP delivery. Returns whether it actually reached
 * Meta's servers (does NOT simulate success — callers must handle the
 * "not configured" case explicitly since OTPs are security-sensitive).
 */
export async function sendWhatsAppText(mobile: string, message: string): Promise<{ success: boolean; error?: string }> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!isWhatsAppCloudApiConfigured()) {
    return { success: false, error: 'WhatsApp Cloud API is not configured (missing WHATSAPP_API_TOKEN / WHATSAPP_PHONE_NUMBER_ID).' };
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: mobile.replace(/\D/g, ''),
        type: 'text',
        text: { preview_url: false, body: message },
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: JSON.stringify(data) };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error calling Meta Cloud API' };
  }
}

interface SendWhatsAppParams {
  recipientType: 'OWNER' | 'CUSTOMER';
  recipientPhone: string;
  invoiceNumber: string;
  invoiceId: number;
  customerName: string;
  totalAmount: number;
  pdfUrlOrBase64?: string;
  isWorkerBill?: boolean;
  workerName?: string;
  paymentMode?: string;
  // Full invoice record — when provided, the real invoice PDF (same layout
  // as the "Download Bill PDF" button) is generated server-side and sent
  // as an attached WhatsApp document instead of a plain text message.
  invoice?: Invoice;
}

/**
 * Uploads a PDF buffer to Meta's WhatsApp media endpoint so it can be
 * referenced (by media id) in a subsequent "document" message. Required
 * first step before a PDF can be attached to a WhatsApp message — Meta's
 * API does not accept raw file bytes directly on the /messages endpoint.
 */
async function uploadWhatsAppPdfMedia(
  phoneNumberId: string,
  token: string,
  pdfBuffer: Buffer,
  filename: string
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  try {
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', 'application/pdf');
    form.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), filename);

    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/media`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form as any,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.id) {
      return { success: false, error: JSON.stringify(data) };
    }
    return { success: true, mediaId: data.id };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error uploading PDF to Meta Cloud API' };
  }
}

/**
 * Sends a previously-uploaded PDF (by media id) as a WhatsApp document
 * message, with an optional short caption.
 */
async function sendWhatsAppPdfDocument(
  phoneNumberId: string,
  token: string,
  to: string,
  mediaId: string,
  filename: string,
  caption?: string
): Promise<{ success: boolean; response: string }> {
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/\D/g, ''),
        type: 'document',
        document: {
          id: mediaId,
          filename,
          // WhatsApp document captions are capped around 1024 chars by Meta
          caption: caption ? caption.slice(0, 1000) : undefined,
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { success: res.ok, response: JSON.stringify(data) };
  } catch (err: any) {
    return { success: false, response: JSON.stringify({ error: err?.message || 'Network error sending WhatsApp document' }) };
  }
}

export async function sendWhatsAppInvoiceNotification(params: SendWhatsAppParams): Promise<{ success: boolean; status: WhatsAppStatus; message: string; logId: number }> {
  const settings = dbService.getData().settings;
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const ownerPhone = settings.owner_whatsapp || '919842100000';

  const recipient = params.recipientPhone || ownerPhone;

  let messageText = '';
  if (params.isWorkerBill) {
    messageText = `✨ *DEVARAJ CRACKERS — NEW POS BILL* ✨\n\n` +
      `*Invoice:* ${params.invoiceNumber}\n` +
      `*Worker:* ${params.workerName || 'Billing Counter'}\n` +
      `*Customer:* ${params.customerName}\n` +
      `*Total Amount:* ₹${params.totalAmount.toLocaleString('en-IN')}\n` +
      `*Payment Mode:* ${params.paymentMode || 'CASH'}\n` +
      `*Time:* ${new Date().toLocaleTimeString('en-IN')}\n\n` +
      `Official PDF Invoice generated and saved in store records.`;
  } else {
    messageText = `🎆 *DEVARAJ CRACKERS — NEW ORDER RECEIVED* 🎆\n\n` +
      `*Invoice:* ${params.invoiceNumber}\n` +
      `*Customer:* ${params.customerName}\n` +
      `*Mobile:* ${recipient}\n` +
      `*Total Amount:* ₹${params.totalAmount.toLocaleString('en-IN')}\n` +
      `*Order Source:* CUSTOMER WEBSITE\n` +
      `*Status:* Confirmed & Ready for Packing\n\n` +
      `Invoice bill PDF attached for warehouse dispatch.`;
  }

  let status: WhatsAppStatus = 'PENDING';
  let apiResponse = '';

  // If real WhatsApp Business Cloud API credentials are provided in env, make the actual HTTP call!
  if (token && phoneNumberId && token !== 'YOUR_WHATSAPP_CLOUD_API_TOKEN') {
    // Preferred path: attach the real invoice PDF (same layout as the
    // "Download Bill PDF" button) as a WhatsApp document, with the order
    // summary as its caption.
    let documentSent = false;
    if (params.invoice) {
      try {
        const pdfDoc = generateInvoicePDF(params.invoice, settings);
        const pdfBuffer = Buffer.from(pdfDoc.output('arraybuffer'));
        const filename = `Devaraj_Crackers_${params.invoiceNumber}.pdf`;

        const upload = await uploadWhatsAppPdfMedia(phoneNumberId, token, pdfBuffer, filename);
        if (upload.success && upload.mediaId) {
          const sendResult = await sendWhatsAppPdfDocument(
            phoneNumberId,
            token,
            recipient,
            upload.mediaId,
            filename,
            messageText
          );
          apiResponse = sendResult.response;
          if (sendResult.success) {
            status = 'DELIVERED';
            documentSent = true;
          }
        } else {
          apiResponse = JSON.stringify({ pdf_upload_error: upload.error });
        }
      } catch (err: any) {
        apiResponse = JSON.stringify({ pdf_generation_error: err?.message || String(err) });
      }
    }

    // Fallback: plain text message (used when no invoice object was passed,
    // or the PDF upload/send step above failed for any reason) so the owner
    // still gets notified even if the document attachment didn't go through.
    if (!documentSent) {
      try {
        const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipient.replace(/\D/g, ''),
            type: 'text',
            text: { preview_url: false, body: messageText },
          }),
        });

        const data = await res.json();
        apiResponse = JSON.stringify(data);
        if (res.ok) {
          status = 'DELIVERED';
        } else {
          status = 'FAILED';
        }
      } catch (err: any) {
        status = 'FAILED';
        apiResponse = JSON.stringify({ error: err.message || 'Network error calling Meta Cloud API' });
      }
    }
  } else {
    // No real WhatsApp Cloud API credentials configured — be honest about it.
    // Nothing is actually sent, so we must NOT report this as delivered.
    // The message is still logged (for audit/history) with a status that
    // correctly reflects "not actually sent yet".
    status = 'PENDING';
    apiResponse = JSON.stringify({
      simulation: true,
      note: 'WHATSAPP_API_TOKEN / WHATSAPP_PHONE_NUMBER_ID are not configured on this server, so no message was actually sent. Add real Meta WhatsApp Cloud API credentials as environment variables to enable automatic sending.',
    });
  }

  // Create WhatsApp log in database
  const db = dbService.getData();
  const logId = db.whatsapp_logs.length > 0 ? Math.max(...db.whatsapp_logs.map(l => l.id)) + 1 : 1;
  const newLog: WhatsAppLog = {
    id: logId,
    recipient_type: params.recipientType,
    recipient_phone: recipient,
    invoice_number: params.invoiceNumber,
    invoice_id: params.invoiceId,
    message: messageText,
    status,
    api_response: apiResponse,
    created_at: new Date().toISOString(),
  };

  db.whatsapp_logs.unshift(newLog);
  dbService.saveSync();

  return {
    success: status === 'DELIVERED',
    status,
    message:
      status === 'DELIVERED'
        ? 'Invoice sent successfully to the store WhatsApp.'
        : status === 'PENDING'
        ? 'WhatsApp Cloud API is not configured, so this was not actually sent — use the manual "Send to Owner" WhatsApp button instead.'
        : 'WhatsApp API sending failed.',
    logId,
  };
}

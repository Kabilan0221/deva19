/**
 * SMS delivery for OTPs (password reset / password change).
 *
 * This intentionally does NOT use the Meta WhatsApp Cloud API — OTPs are
 * sent as plain SMS instead, so login/password-reset works even when no
 * WhatsApp Business number is available (e.g. the shop's number is already
 * registered to another WhatsApp Business account).
 *
 * Supports two common providers — set env vars for whichever one you sign
 * up with. If both are configured, Twilio is tried first.
 *
 *   Twilio (https://www.twilio.com):
 *     TWILIO_ACCOUNT_SID=...
 *     TWILIO_AUTH_TOKEN=...
 *     TWILIO_FROM_NUMBER=+1XXXXXXXXXX          (or TWILIO_MESSAGING_SERVICE_SID)
 *
 *   MSG91 (https://msg91.com — popular for Indian numbers):
 *     MSG91_AUTH_KEY=...
 *     MSG91_SENDER_ID=DEVCRK                   (6-char approved sender id)
 *     MSG91_DLT_TE_ID=...                      (optional, TRAI/DLT template id if your account requires it)
 */

function isTwilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID)
  );
}

function isMsg91Configured(): boolean {
  return !!(process.env.MSG91_AUTH_KEY && process.env.MSG91_SENDER_ID);
}

export function isSmsConfigured(): boolean {
  return isTwilioConfigured() || isMsg91Configured();
}

function toIndianE164(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return digits.startsWith('+') ? mobile : `+${digits}`;
}

function toIndianLocalWithCountryCode(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

async function sendViaTwilio(mobile: string, message: string): Promise<{ success: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  const form = new URLSearchParams();
  form.set('To', toIndianE164(mobile));
  form.set('Body', message);
  if (messagingServiceSid) {
    form.set('MessagingServiceSid', messagingServiceSid);
  } else if (from) {
    form.set('From', from);
  }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: JSON.stringify(data) };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error calling Twilio' };
  }
}

async function sendViaMsg91(mobile: string, message: string): Promise<{ success: boolean; error?: string }> {
  const authKey = process.env.MSG91_AUTH_KEY!;
  const senderId = process.env.MSG91_SENDER_ID!;
  const dltTemplateId = process.env.MSG91_DLT_TE_ID || '';

  const params = new URLSearchParams({
    authkey: authKey,
    mobiles: toIndianLocalWithCountryCode(mobile),
    message,
    sender: senderId,
    route: '4',
    country: '91',
  });
  if (dltTemplateId) params.set('DLT_TE_ID', dltTemplateId);

  try {
    const res = await fetch(`https://api.msg91.com/api/sendhttp.php?${params.toString()}`, {
      method: 'GET',
    });
    const text = await res.text();
    // MSG91's classic HTTP API returns a bare request-id string on success
    // and a plain-text error message (no JSON) on failure.
    const looksLikeError = /error/i.test(text) && !/^\d/.test(text.trim());
    if (!res.ok || looksLikeError) {
      return { success: false, error: text };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error calling MSG91' };
  }
}

/**
 * Sends a plain-text SMS (used for OTP delivery). Returns whether it
 * actually reached the SMS provider — does NOT simulate success, since
 * OTPs are security-sensitive and callers must handle the "not
 * configured" case explicitly.
 */
export async function sendSmsText(mobile: string, message: string): Promise<{ success: boolean; error?: string; provider?: 'twilio' | 'msg91' }> {
  if (!mobile) {
    return { success: false, error: 'No mobile number on file for this account.' };
  }

  if (isTwilioConfigured()) {
    const result = await sendViaTwilio(mobile, message);
    return { ...result, provider: 'twilio' };
  }

  if (isMsg91Configured()) {
    const result = await sendViaMsg91(mobile, message);
    return { ...result, provider: 'msg91' };
  }

  return {
    success: false,
    error: 'No SMS provider is configured (set TWILIO_* or MSG91_* environment variables).',
  };
}

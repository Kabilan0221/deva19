/**
 * Durable key-value persistence for the app's database.
 *
 * Vercel's serverless functions only get a writable /tmp folder, and /tmp is
 * wiped on cold starts, redeploys, and periodically even for "warm"
 * instances. That's fine for scratch space, but it means anything written
 * only to /tmp (orders, invoices, password resets, etc.) can silently
 * disappear a few minutes after it was created — which is why a WhatsApp
 * "download your bill" link could work once and then 404 later.
 *
 * This module talks to a REST-based Redis store (Vercel KV, or Upstash
 * Redis directly) to persist the whole database as one JSON document, so it
 * survives cold starts. It uses the built-in fetch API only — no SDK
 * dependency — and supports both common env var names:
 *
 *   Vercel KV / Upstash via Vercel Marketplace:
 *     KV_REST_API_URL=...
 *     KV_REST_API_TOKEN=...
 *
 *   Upstash Redis directly (https://upstash.com):
 *     UPSTASH_REDIS_REST_URL=...
 *     UPSTASH_REDIS_REST_TOKEN=...
 *
 * If neither is configured, every function here is a safe no-op — the app
 * keeps working exactly as before (in-memory + best-effort /tmp cache), it
 * just won't survive a cold start. See DEPLOY.md for setup instructions.
 */

function getKvUrl(): string | null {
  return process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || null;
}

function getKvToken(): string | null {
  return process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || null;
}

export function isKvConfigured(): boolean {
  return !!(getKvUrl() && getKvToken());
}

/** Fetches a stored string value, or null if not found / not configured. */
export async function kvGet(key: string): Promise<string | null> {
  const url = getKvUrl();
  const token = getKvToken();
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data && typeof data.result === 'string' ? data.result : null;
  } catch (err) {
    console.error('KV get error:', err);
    return null;
  }
}

/** Stores a string value. Returns whether the write reached the store. */
export async function kvSet(key: string, value: string): Promise<boolean> {
  const url = getKvUrl();
  const token = getKvToken();
  if (!url || !token) return false;

  try {
    const res = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body: value,
    });
    return res.ok;
  } catch (err) {
    console.error('KV set error:', err);
    return false;
  }
}

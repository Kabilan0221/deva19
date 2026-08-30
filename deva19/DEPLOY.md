# Deploying "Devaraj Crackers" to Vercel

This project is a Vite + React frontend with an Express API (`server/`), wrapped for
Vercel as a serverless function via `api/index.ts` + `vercel.json`.

## What was fixed in this version

1. **Login / "HTTP error 500" on every API call** — `server/db.ts` was writing to a
   local JSON file with `fs`. Vercel's serverless functions run on a **read-only
   filesystem** (except `/tmp`), so the database module could throw during import and
   crash *every* route, including `/api/auth/login`. It now:
   - Always boots from a safe in-memory seed first (can never throw on import).
   - Detects Vercel (`process.env.VERCEL`) and writes only to `/tmp` there.
   - Never lets a failed write crash the request that triggered it.
   - This was verified by simulating a genuinely read-only filesystem and
     confirming both `/api/auth/login` and `/api/orders` return `200`.

2. **Price list PDF — overlapping "Rs." values** — `src/utils/pdfGenerator.ts` had
   fixed x-coordinates for the "Content" and "Actual Price" columns that were close
   enough together that long content strings ran straight into the price text. All
   three PDF tables (invoice, order estimate, full price list) now use fixed
   non-overlapping column widths and truncate long text with "…" instead of
   letting it overflow.

3. **WhatsApp notification on order confirm** — the backend already sends the order
   to the owner's WhatsApp automatically the moment an order is placed
   (`server/whatsapp.ts`), no redirect needed. The success screen was showing a
   redundant "tap to open WhatsApp" button that made this look manual/broken. It now
   shows the *real* delivery status from the server, and only highlights the manual
   button as a fallback if the automatic send actually failed.

## ⚠️ Still true: the JSON "database" is not a real database

Even with the fix above, `data/database.json` on Vercel now writes to `/tmp`, which:
- **Persists only for the lifetime of one warm serverless instance** (can be minutes
  to a few hours, then a cold start wipes it back to the seed data).
- **Is not shared across concurrent instances** — under real traffic, different
  requests can hit different instances with different data.

This is fine for a demo/catalog site, but **not** for real order-taking or a working
POS in production. For real persistence, swap the storage layer in `server/db.ts` for
an actual database — Vercel Postgres, Supabase, Turso, or MongoDB Atlas all have free
tiers and simple Node clients. Happy to wire one of these up next — it's a
moderate-sized change concentrated almost entirely in `server/db.ts`.

## Steps

1. **Push this folder to a GitHub repo** (or GitLab/Bitbucket).
2. **Go to vercel.com → Add New → Project**, import that repo.
3. Vercel should auto-detect the settings from `vercel.json`. If it asks, use:
   - Build Command: `vite build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. **Add Environment Variables** (Project Settings → Environment Variables):

   | Variable | Required? | What it's for |
   |---|---|---|
   | `SESSION_SECRET` | **Yes, set your own** | Signs login session tokens. Falls back to a default if unset, which is fine for testing but should be a long random string in production. |
   | `WHATSAPP_API_TOKEN` | Optional | Meta WhatsApp Cloud API token — see below. Without it, WhatsApp sending is *simulated* (marked as delivered internally, but no real WhatsApp message is sent). |
   | `WHATSAPP_PHONE_NUMBER_ID` | Optional | Meta WhatsApp Cloud API phone number ID — see below. |
   | `OWNER_WHATSAPP_NUMBER` | Optional | Overrides the store owner's WhatsApp number the order notification is sent to (otherwise uses the number in Store Settings). |
   | `GEMINI_API_KEY` | Optional | Only needed if you use any AI-assisted features. |
   | `RAZORPAY_KEY_ID` | Optional | Only needed if you wire up real Razorpay payments. |

5. Click **Deploy**.

### Getting real WhatsApp Cloud API credentials (for automatic sending)

1. Go to [developers.facebook.com](https://developers.facebook.com) → create an app →
   add the **WhatsApp** product.
2. In the WhatsApp → API Setup screen, you'll get a **temporary access token** and a
   **Phone Number ID** immediately for testing.
3. For production, create a permanent token (System User token) under Business
   Settings, and register/verify your business phone number.
4. Put the token in `WHATSAPP_API_TOKEN` and the ID in `WHATSAPP_PHONE_NUMBER_ID` in
   Vercel's env vars, then redeploy.
5. Until these are set, the app still works end-to-end (orders, PDFs, login) — it
   just won't deliver a real WhatsApp message, and the success screen will show the
   manual "notify via WhatsApp" button as a fallback.

## Login credentials (seed data)

| Role | Username | Password |
|---|---|---|
| Owner | `owner` (also accepts `admin`, the owner's mobile number, or `gopinath`) | `devaraj@123` |
| Worker (Counter 1) | `worker1` | `worker@123` |
| Worker (Counter 2) | `worker2` | `worker@123` |

These are seeded in `server/db.ts` on first boot. Change them from the Admin
Dashboard once logged in as `owner`, or edit the seed data before deploying.

## Forgot the admin password? (no MSG91/Twilio/WhatsApp needed)

There are two ways to reset a forgotten owner/staff password:

1. **OTP via SMS** — needs Twilio or MSG91 credentials set as env vars
   (see the SMS section above). Good for production once you've set that up.
2. **Recovery Key** — works immediately, with zero third-party setup. On the
   login screen, click **"Reset with Recovery Key"**, enter:
   - Username (e.g. `owner`)
   - Recovery Key — defaults to `Devaraj@Recovery#2026` (see
     `server/auth.ts`) unless you set your own via the `ADMIN_RECOVERY_KEY`
     env var in Vercel → Project → Settings → Environment Variables.
   - Your new password
   
   This resets the password directly and logs you in — no OTP, no SMS
   provider, no Meta/WhatsApp app review needed.

   **Important:** treat the Recovery Key like a master password — anyone who
   has it can reset any account. Set your own `ADMIN_RECOVERY_KEY` (a long,
   unique phrase) in Vercel before going live, instead of relying on the
   built-in default, and redeploy after changing it.

## Fixed: "Download bill" link only worked once

**Cause:** the database (orders, invoices, users, everything) was only being
written to Vercel's `/tmp` folder. `/tmp` is wiped whenever the serverless
function restarts — after inactivity, after a redeploy, sometimes even
between requests a few minutes apart. So a WhatsApp bill link worked right
after checkout (warm function, invoice still in memory) but 404'd once the
function went cold and forgot the invoice ever existed.

**Fix:** the app now also persists the database to a durable Redis store
(Vercel KV / Upstash) on every write, and reloads the latest copy at the
start of every cold start, so nothing is lost between function restarts.

**To enable it (one-time, ~2 minutes, free tier is enough for this site):**
1. Vercel Dashboard → your project → **Storage** tab → **Create Database** →
   choose **Redis** (powered by Upstash).
2. Connect it to this project — Vercel automatically adds `KV_REST_API_URL`
   and `KV_REST_API_TOKEN` as environment variables for you.
3. Redeploy (Vercel usually prompts you to redeploy automatically after
   connecting storage).

Until you do this, the site still works exactly as before (nothing breaks),
it just falls back to the old `/tmp`-only behavior — so bill links can still
expire after a while.

## SSL / HTTPS

Vercel automatically issues and renews a free SSL certificate for every
deployment — your `*.vercel.app` URL is already served over HTTPS with no
setup needed. If you attach your own domain (e.g. `devarajcrackers.com`),
go to **Project → Settings → Domains**, add it, and follow Vercel's DNS
instructions; it issues a certificate for that domain automatically too,
usually within a few minutes.

On top of that automatic certificate, this deploy now also sends security
headers (in `vercel.json`) that:
- Force browsers to always use HTTPS for this site (HSTS)
- Block content-type sniffing and clickjacking (`X-Content-Type-Options`,
  `X-Frame-Options`)
- Restrict camera/microphone/location access to what the site actually uses

## Local development is unaffected

`npm run dev` still runs the original Express + Vite dev server, writing to
`data/database.json` on your local disk exactly as before.

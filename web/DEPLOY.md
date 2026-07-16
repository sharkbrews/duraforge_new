# Duraforge UK — Deployment Guide (Stage 4b)

This is the plain-English checklist to take the site live on **Vercel** with a
**hosted Postgres** database, **real Stripe** payments, and **Klaviyo** email.

Everything runs locally without any of these (mock checkout + console logging),
so you only need this when you're ready to go live.

---

## 1. Hosted Postgres (Supabase or Neon) — **required before Vercel works**

Your Mac Postgres only runs locally. Vercel needs a **cloud** database.

### Neon (recommended — free tier, 2 minutes)

1. Go to [neon.tech](https://neon.tech) → Sign up (GitHub is fine).
2. **New Project** → name it `duraforge` → region **EU (London)** if available.
3. On the dashboard, copy the **connection string** (starts with `postgresql://…`).
   - Use the **pooled** connection string for `DATABASE_URL` on Vercel.
4. You'll paste this into Vercel as `DATABASE_URL` (step 4).

### Supabase (alternative)

1. Create a free project at [supabase.com](https://supabase.com).
2. **Project Settings → Database → Connection string → URI** (copy it).
3. Paste into Vercel as `DATABASE_URL`.

## 2. Stripe (payments)

1. Create an account at [stripe.com](https://stripe.com) and finish activation.
2. From **Developers → API keys**, copy:
   - **Secret key** → `STRIPE_SECRET_KEY` (`sk_live_…` or `sk_test_…`)
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_live_…`)
3. From **Developers → Webhooks**, add an endpoint:
   - URL: `https://YOUR-DOMAIN/api/stripe/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
   - Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET` (`whsec_…`)
4. Turn on **Stripe Tax** (Settings → Tax) for automatic UK VAT.

## 3. Klaviyo (email marketing) — optional at launch

1. Create an account at [klaviyo.com](https://klaviyo.com).
2. **Settings → API keys → Create Private API Key** → `KLAVIYO_API_KEY`.
3. Events (`user.registered`, `order.placed`, `duracoins.earned`, etc.) will
   start flowing automatically. Build the flows/automations in the Klaviyo UI.

## 4. Deploy to Vercel

### Option A — Vercel website (easiest, recommended)

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with **GitHub**.
2. Import **`sharkbrews/duraforge_new`**.
3. On the configure screen:
   - **Root Directory:** click *Edit* → select **`web`** → Continue.
   - **Framework Preset:** Next.js (auto-detected).
   - **Build Command:** leave default (`prisma generate && next build` from `vercel.json`).
4. Expand **Environment Variables** and add these (Production + Preview + Development):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | hosted Postgres string (step 1) — **required** |
   | `AUTH_SECRET` | generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
   | `AUTH_TRUST_HOST` | `true` |
   | `ADMIN_EMAIL` | e.g. `admin@duraforge.co.uk` |
   | `ADMIN_INITIAL_PASSWORD` | strong temp password (change on first login) |
   | `ADMIN_IP_ALLOWLIST` | leave **empty** for now (allows all IPs) |
   | `STRIPE_SECRET_KEY` | optional — leave empty for mock checkout |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | optional |
   | `STRIPE_WEBHOOK_SECRET` | optional |
   | `KLAVIYO_API_KEY` | optional |

5. Click **Deploy**. First build takes ~2 minutes.
6. After deploy succeeds, run step 5 below (migrate + seed the hosted DB).
7. Open your site URL → register a trade account → test checkout.

### Option B — Vercel CLI (if you prefer terminal)

```bash
cd web
npx vercel login          # one-time browser auth
npx vercel link           # link to your Vercel project
npx vercel env add DATABASE_URL
npx vercel env add AUTH_SECRET
# … add other vars …
npx vercel --prod
```

Then run step 5 (migrate + seed) against the hosted DB.

## 5. First-time database setup (once, after first deploy)

From your machine, pointed at the **hosted** DB:

```bash
cd web
DATABASE_URL="<hosted-connection-string>" npx prisma migrate deploy
DATABASE_URL="<hosted-connection-string>" npm run db:seed
```

This creates the tables, seeds the 24 products + 2 campaigns, and creates the
admin user. On first admin login you'll be forced to change the password and
enrol MFA.

## 6. Go-live smoke test

- [ ] Register a trade account → receive Klaviyo welcome (if configured)
- [ ] Add to basket → checkout with a Stripe **test card** `4242 4242 4242 4242`
- [ ] Order appears in `/admin/orders`; DuraCoins credited on `/account`
- [ ] VAT invoice downloads from the order page
- [ ] Admin login enforces MFA; blocked IP gets 403 (if allowlist set)
- [ ] Stripe dashboard shows the payment; webhook delivered

---

**Notes**
- No card data ever touches our servers — Stripe tokenises everything.
- BACS orders are recorded as "held until payment clears" (no charge taken).
- To rotate the admin password later, use the `/admin/security` page.

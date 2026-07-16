# Duraforge UK — Deployment Guide (Stage 4b)

This is the plain-English checklist to take the site live on **Vercel** with a
**hosted Postgres** database, **real Stripe** payments, and **Klaviyo** email.

Everything runs locally without any of these (mock checkout + console logging),
so you only need this when you're ready to go live.

---

## 1. Hosted Postgres (Supabase or Neon)

1. Create a free project at [supabase.com](https://supabase.com) or [neon.tech](https://neon.tech).
2. Copy the connection string they give you (starts with `postgresql://`).
3. You'll paste it into Vercel as `DATABASE_URL` (step 4).

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

1. Go to [vercel.com](https://vercel.com), **Add New → Project**, import
   `sharkbrews/duraforge_new`.
2. Set **Root Directory** to `web`.
3. Add Environment Variables (Project → Settings → Environment Variables):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | hosted Postgres string (step 1) |
   | `AUTH_SECRET` | generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
   | `STRIPE_SECRET_KEY` | from step 2 |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | from step 2 |
   | `STRIPE_WEBHOOK_SECRET` | from step 2 |
   | `KLAVIYO_API_KEY` | from step 3 (optional) |
   | `ADMIN_EMAIL` | your admin login email |
   | `ADMIN_INITIAL_PASSWORD` | a strong temporary password |
   | `ADMIN_IP_ALLOWLIST` | office/VPN IPs, comma-separated (or blank) |
   | `COMPANY_VAT_NUMBER` | once VAT-registered |

4. Deploy. The build runs `prisma generate && next build`.

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

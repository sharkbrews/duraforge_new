# Vercel hosting — your checklist

You've connected **duraforge_new** on GitHub to Vercel. The repo is ready.
Follow these steps in order — each one takes a few minutes.

---

## Step 1 — Set the root folder (IMPORTANT)

In Vercel → your **duraforge_new** project → **Settings** → **General**:

- Find **Root Directory**
- Click **Edit** → type **`web`** → **Save**

Without this, Vercel looks at the wrong folder and the build fails.

---

## Step 2 — Add a cloud database (Neon)

Your Mac database only works locally. Vercel needs Postgres in the cloud.

**Easiest way (inside Vercel):**

1. Vercel project → **Storage** tab → **Create Database** → choose **Neon** (free)
2. Accept the terms if asked
3. Vercel automatically adds `DATABASE_URL` to your env vars ✓

**Or manually:** sign up at [neon.tech](https://neon.tech), create a project, copy the
**pooled** connection string, and add it in Step 3 as `DATABASE_URL`.

---

## Step 3 — Add environment variables

Vercel project → **Settings** → **Environment Variables**.

Add each one for **Production** (and Preview if you want preview deploys to work):

| Variable | What to put |
|---|---|
| `DATABASE_URL` | Auto-filled if you used Vercel Storage/Neon in Step 2. Otherwise paste your Neon connection string. |
| `AUTH_SECRET` | Any long random string. Generate one by running this in Terminal: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `AUTH_TRUST_HOST` | `true` |
| `ADMIN_EMAIL` | Your admin login email, e.g. `admin@duraforge.co.uk` |
| `ADMIN_INITIAL_PASSWORD` | A strong temporary password (you'll change it on first login) |
| `ADMIN_IP_ALLOWLIST` | Leave **empty** for now (allows all IPs) |

**Optional (can add later):**

| Variable | When |
|---|---|
| `STRIPE_SECRET_KEY` | When you want real card payments |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Same |
| `STRIPE_WEBHOOK_SECRET` | Same |
| `KLAVIYO_API_KEY` | When you want email marketing |

Without Stripe keys, checkout still works in **test/mock mode**.

---

## Step 4 — Deploy

1. Vercel project → **Deployments** tab
2. If nothing deployed yet: **Redeploy** (or push any commit to `main` on GitHub — Vercel auto-deploys)
3. Wait ~2 minutes for the build to finish (green ✓)

If the build fails, check the build log — usually it's a missing env var.

---

## Step 5 — Set up the database (one time only)

After the first successful deploy, you need to create the tables and seed products.
Run these **once** on your Mac (replace the connection string with your Neon `DATABASE_URL`):

```bash
cd ~/Documents/duraforge/web

# Paste your Neon DATABASE_URL between the quotes:
export DATABASE_URL="postgresql://...."

npx prisma migrate deploy
npm run db:seed
```

This creates all tables, loads 24 products, 2 campaigns, and your admin user.

---

## Step 6 — Test the live site

Open your Vercel URL (something like `duraforge-new.vercel.app`):

- [ ] Homepage loads
- [ ] **Shop** → open a product → **Add to basket**
- [ ] **Account → Register** → create a trade account
- [ ] **Checkout** → place an order (mock payment if no Stripe keys)
- [ ] **Admin** → go to `/admin/login` → sign in → change password + set up MFA

---

## Custom domain (optional, later)

Vercel → **Settings** → **Domains** → add e.g. `shop.duraforge.co.uk` and follow
the DNS instructions from your domain registrar.

---

## Need help?

Full details (Stripe, Klaviyo, invoices): see `DEPLOY.md` in this folder.

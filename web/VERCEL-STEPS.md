# Go live on Vercel — **duraforge** project

> **Status (auto-done for you):** Neon database connected ✓ · tables created ✓ ·
> 24 products + admin user seeded ✓ · env vars set ✓

Your live URL will be: **https://duraforge-tushar-jaiswals-projects.vercel.app**
(or similar — check Vercel → **duraforge** → **Domains**)

---

## The ONE thing you may need to click

If the deploy fails or shows 404, do this once:

1. Open [vercel.com](https://vercel.com) → project **duraforge**
2. **Settings** → **General** → **Root Directory**
3. Click **Edit** → type **`web`** → **Save**
4. Go to **Deployments** → click **⋯** on the latest → **Redeploy**

That's it. The code lives in the `web` folder inside your GitHub repo — Vercel
needs to know that.

---

## Admin login (first time)

- URL: **`https://YOUR-URL/admin/login`**
- Email: **`admin@duraforge.co.uk`**
- Password: **`UFUVVhkdyTeVYcJi`** (change this on first login + set up MFA)

---

## Quick test once it's live

1. Open the homepage
2. **Shop** → add a kit to basket
3. **Register** a trade account → checkout
4. **Admin login** → change password → scan MFA QR code

---

## Custom domain (later, optional)

Vercel → **duraforge** → **Settings** → **Domains** → add your domain.

---

Full Stripe / Klaviyo setup: see `DEPLOY.md`.

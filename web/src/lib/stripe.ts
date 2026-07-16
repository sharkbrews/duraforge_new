import Stripe from "stripe";

// Server-side Stripe client. Only initialised when a secret key is present so
// local dev works without Stripe (mock checkout path stays available).

let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cached) {
    // Use the account's default API version (avoids pinning a literal that
    // could drift from the installed SDK's expected type).
    cached = new Stripe(key);
  }
  return cached;
}

/** True when real Stripe payments are configured (server side). */
export function isStripeLive(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export const VAT_RATE = 0.2;

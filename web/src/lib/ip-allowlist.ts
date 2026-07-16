// Edge-safe IP allowlist for the admin area. No Node-only APIs here — this is
// imported by middleware which runs on the edge runtime.

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/** Extract the caller's IP from standard proxy headers. */
export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

/**
 * Returns true if the request IP may access the admin area.
 * - If ADMIN_IP_ALLOWLIST is unset/empty → allow all (dev default).
 * - Loopback / local requests are always allowed (local development).
 * - Otherwise the IP must be listed exactly in the comma-separated env var.
 */
export function isIpAllowed(headers: Headers): boolean {
  const raw = process.env.ADMIN_IP_ALLOWLIST?.trim();
  if (!raw) return true;

  const ip = getClientIp(headers);
  if (!ip) return true; // no IP available (typical in local dev)
  if (LOOPBACK.has(ip)) return true;

  const allowed = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return allowed.includes(ip);
}

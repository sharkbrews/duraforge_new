import * as OTPAuth from "otpauth";

const ISSUER = "Duraforge Admin";

function buildTotp(email: string, secretBase32: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

/** Create a fresh base32 TOTP secret. */
export function generateMfaSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

/** The otpauth:// URI to encode in a QR code for authenticator apps. */
export function mfaOtpauthUri(email: string, secretBase32: string): string {
  return buildTotp(email, secretBase32).toString();
}

/** Validate a 6-digit code against the secret (±1 time-step tolerance). */
export function verifyMfaToken(
  token: string,
  secretBase32: string,
): boolean {
  const cleaned = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  const totp = buildTotp("admin", secretBase32);
  const delta = totp.validate({ token: cleaned, window: 1 });
  return delta !== null;
}

const PLACEHOLDER_VALUES = new Set([
  "",
  "change-me-to-a-long-random-string",
  "replace-me",
  "REPLACE_WITH_STRONG_PASSWORD",
]);

export function getProductionConfigErrors(): string[] {
  if (process.env.NODE_ENV !== "production") return [];

  const errors: string[] = [];
  const authSecret = process.env.AUTH_SECRET?.trim() ?? "";
  if (PLACEHOLDER_VALUES.has(authSecret) || authSecret.length < 32) {
    errors.push("AUTH_SECRET must be a unique random value of at least 32 characters.");
  }

  if (!process.env.DATABASE_URL?.trim()) {
    errors.push("DATABASE_URL is required.");
  }

  if (!process.env.ADMIN_IP_ALLOWLIST?.trim()) {
    errors.push("ADMIN_IP_ALLOWLIST must contain at least one production address.");
  }

  return errors;
}

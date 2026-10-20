// Product identifier rules shared by the seed, the search API and the storefront.
// Normalisation must match scripts/build_sku_register.py: keep only A-Z and 0-9.

export const IDENTIFIER_TYPES = [
  "DF_SKU",
  "DRG_ALIAS",
  "SUPPLIER_CODE",
  "FPE_REF",
  "OEM_REF",
  "CROSS_REF",
  "GTIN",
] as const;

export type IdentifierType = (typeof IDENTIFIER_TYPES)[number];

export const DF_CODE_PATTERN = /^DF-\d{6}$/;

export function normaliseCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isDfCode(value: string): boolean {
  return DF_CODE_PATTERN.test(value.trim().toUpperCase());
}

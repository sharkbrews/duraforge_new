// Duraforge product catalogue.
//
// Data is derived from the real Duraforge docs (Deepkamal price list OEM refs,
// the Master Machine Reference dimensions, and website-requirements.md section 13).
//
// IMPORTANT: This customer-facing catalogue deliberately contains NO cost columns
// (purchase price INR/GBP, landing price). Those are admin-only per the business
// rules and must never reach the customer. `price` is the customer sale price
// (GBP, ex-VAT). `fpePrice` is the competitor reference used only to show savings.

export type Material = "NBR" | "PU" | "PTFE" | "FKM";

export type CrossRefSource = "FPE" | "Hallite" | "JCB OEM" | "CAT OEM";

export interface CrossRef {
  source: CrossRefSource;
  part: string;
}

export interface KitComponent {
  item: string;
  qty: number;
}

export interface Product {
  sku: string;
  name: string;
  brand: string;
  brandSlug: string;
  model: string;
  position: string;
  rod: number; // mm
  bore: number; // mm
  height: number; // mm
  material: Material;
  hardnessShoreA: number;
  tempMinC: number;
  tempMaxC: number;
  pressureBar: number;
  contents: KitComponent[];
  fits: string[];
  crossRefs: CrossRef[];
  price: number; // sale price GBP, ex-VAT (customer visible)
  fpePrice: number; // competitor reference for savings display
  stock: number;
  madeIn: string;
}

const STD_CONTENTS: KitComponent[] = [
  { item: "Rod seal (U-cup)", qty: 1 },
  { item: "Wiper / scraper seal", qty: 1 },
  { item: "Piston seal", qty: 1 },
  { item: "Guide / wear rings", qty: 2 },
  { item: "O-rings", qty: 3 },
];

export const products: Product[] = [
  // ---- JCB 3DX / 3CX (2010-11 black cylinder) ----
  {
    sku: "DRG-NBR-3DX-BOOM",
    name: "JCB 3DX/3CX Boom Cylinder Seal Kit",
    brand: "JCB",
    brandSlug: "jcb",
    model: "3DX / 3CX",
    position: "Boom",
    rod: 80,
    bore: 140,
    height: 10,
    material: "NBR",
    hardnessShoreA: 85,
    tempMinC: -30,
    tempMaxC: 100,
    pressureBar: 250,
    contents: STD_CONTENTS,
    fits: ["JCB 3DX (2010-11)", "JCB 3CX (2010-11)"],
    crossRefs: [
      { source: "JCB OEM", part: "332Y6440" },
      { source: "FPE", part: "FPE-3DX-BM-80" },
    ],
    price: 21,
    fpePrice: 29.5,
    stock: 18,
    madeIn: "India",
  },
  {
    sku: "DRG-NBR-3DX-DIPPER",
    name: "JCB 3DX/3CX Dipper Cylinder Seal Kit",
    brand: "JCB",
    brandSlug: "jcb",
    model: "3DX / 3CX",
    position: "Dipper",
    rod: 65,
    bore: 110,
    height: 9.5,
    material: "NBR",
    hardnessShoreA: 85,
    tempMinC: -30,
    tempMaxC: 100,
    pressureBar: 250,
    contents: STD_CONTENTS,
    fits: ["JCB 3DX (2010-11)", "JCB 3CX (2010-11)"],
    crossRefs: [
      { source: "JCB OEM", part: "332Y6462" },
      { source: "FPE", part: "FPE-3DX-DP-65" },
    ],
    price: 24,
    fpePrice: 33.8,
    stock: 14,
    madeIn: "India",
  },
  {
    sku: "DRG-NBR-3DX-BUCKET",
    name: "JCB 3DX/3CX Bucket Cylinder Seal Kit",
    brand: "JCB",
    brandSlug: "jcb",
    model: "3DX / 3CX",
    position: "Bucket",
    rod: 55,
    bore: 95,
    height: 8.5,
    material: "NBR",
    hardnessShoreA: 85,
    tempMinC: -30,
    tempMaxC: 100,
    pressureBar: 250,
    contents: STD_CONTENTS,
    fits: ["JCB 3DX (2010-11)", "JCB 3CX (2010-11)"],
    crossRefs: [{ source: "JCB OEM", part: "332Y6519" }],
    price: 17,
    fpePrice: 24,
    stock: 22,
    madeIn: "India",
  },
  {
    sku: "DRG-NBR-3DX-STAB",
    name: "JCB 3DX/3CX Stabiliser Cylinder Seal Kit",
    brand: "JCB",
    brandSlug: "jcb",
    model: "3DX / 3CX",
    position: "Stabiliser",
    rod: 50,
    bore: 90,
    height: 8,
    material: "NBR",
    hardnessShoreA: 85,
    tempMinC: -30,
    tempMaxC: 100,
    pressureBar: 250,
    contents: STD_CONTENTS,
    fits: ["JCB 3DX (2010-11)", "JCB 3CX (2010-11)"],
    crossRefs: [{ source: "JCB OEM", part: "332Y5599" }],
    price: 14,
    fpePrice: 19.9,
    stock: 35,
    madeIn: "India",
  },
  {
    sku: "DRG-NBR-3DX-STEER",
    name: "JCB 3DX/3CX Steering Ram Seal Kit",
    brand: "JCB",
    brandSlug: "jcb",
    model: "3DX / 3CX",
    position: "Steering",
    rod: 45,
    bore: 80,
    height: 7.5,
    material: "NBR",
    hardnessShoreA: 85,
    tempMinC: -30,
    tempMaxC: 100,
    pressureBar: 200,
    contents: STD_CONTENTS,
    fits: ["JCB 3DX (2010-11)", "JCB 3CX (2010-11)"],
    crossRefs: [{ source: "JCB OEM", part: "550/41002" }],
    price: 13,
    fpePrice: 18.5,
    stock: 40,
    madeIn: "India",
  },

  // ---- JCB 531-70 Telehandler ----
  {
    sku: "DRG-PU-531-BOOMLIFT",
    name: "JCB 531-70 Telehandler Boom Lift Cylinder Seal Kit",
    brand: "JCB",
    brandSlug: "jcb",
    model: "531-70 Telehandler",
    position: "Boom lift",
    rod: 70,
    bore: 130,
    height: 12,
    material: "PU",
    hardnessShoreA: 92,
    tempMinC: -30,
    tempMaxC: 110,
    pressureBar: 300,
    contents: STD_CONTENTS,
    fits: ["JCB 531-70", "JCB 532-70", "JCB 533-105"],
    crossRefs: [{ source: "FPE", part: "FPE-TH-70-130" }],
    price: 34,
    fpePrice: 48,
    stock: 8,
    madeIn: "India",
  },
  {
    sku: "DRG-PU-531-TILT",
    name: "JCB 531-70 Telehandler Carriage Tilt Cylinder Seal Kit",
    brand: "JCB",
    brandSlug: "jcb",
    model: "531-70 Telehandler",
    position: "Carriage tilt",
    rod: 50,
    bore: 110,
    height: 10,
    material: "PU",
    hardnessShoreA: 92,
    tempMinC: -30,
    tempMaxC: 110,
    pressureBar: 300,
    contents: STD_CONTENTS,
    fits: ["JCB 531-70", "JCB 532-70"],
    crossRefs: [{ source: "FPE", part: "FPE-TH-50-110" }],
    price: 27,
    fpePrice: 38,
    stock: 12,
    madeIn: "India",
  },

  // ---- JCB 535-95 Telehandler ----
  {
    sku: "DRG-PU-535-BOOMLIFT",
    name: "JCB 535-95 Telehandler Boom Lift Cylinder Seal Kit",
    brand: "JCB",
    brandSlug: "jcb",
    model: "535-95 Telehandler",
    position: "Boom lift",
    rod: 75,
    bore: 130,
    height: 12,
    material: "PU",
    hardnessShoreA: 92,
    tempMinC: -30,
    tempMaxC: 110,
    pressureBar: 300,
    contents: STD_CONTENTS,
    fits: ["JCB 535-95", "JCB 535-125"],
    crossRefs: [{ source: "FPE", part: "FPE-TH-75-130" }],
    price: 36,
    fpePrice: 51,
    stock: 6,
    madeIn: "India",
  },

  // ---- CAT 424B ----
  {
    sku: "DRG-PU-CAT424-BOOM",
    name: "CAT 424B Boom Cylinder Seal Kit (2012)",
    brand: "CAT / Caterpillar",
    brandSlug: "caterpillar",
    model: "424B",
    position: "Boom",
    rod: 85,
    bore: 120,
    height: 12,
    material: "PU",
    hardnessShoreA: 90,
    tempMinC: -30,
    tempMaxC: 110,
    pressureBar: 300,
    contents: STD_CONTENTS,
    fits: ["CAT 424B (2012)"],
    crossRefs: [{ source: "CAT OEM", part: "340-4687" }],
    price: 25,
    fpePrice: 35,
    stock: 11,
    madeIn: "India",
  },
  {
    sku: "DRG-PU-CAT424-DIPPER",
    name: "CAT 424B Dipper Cylinder Seal Kit",
    brand: "CAT / Caterpillar",
    brandSlug: "caterpillar",
    model: "424B",
    position: "Dipper",
    rod: 100,
    bore: 140,
    height: 14,
    material: "PU",
    hardnessShoreA: 90,
    tempMinC: -30,
    tempMaxC: 110,
    pressureBar: 300,
    contents: STD_CONTENTS,
    fits: ["CAT 424B"],
    crossRefs: [{ source: "CAT OEM", part: "454-0380" }],
    price: 27,
    fpePrice: 38,
    stock: 7,
    madeIn: "India",
  },

  // ---- Hyva tipper cylinders ----
  {
    sku: "DRG-PU-HYVA-162-4",
    name: "Hyva FE-162-4 Tipper Cylinder Seal Kit",
    brand: "Hyva",
    brandSlug: "hyva",
    model: "FE-162-4 Tipper",
    position: "Tipper cylinder",
    rod: 162,
    bore: 200,
    height: 15,
    material: "PU",
    hardnessShoreA: 92,
    tempMinC: -30,
    tempMaxC: 110,
    pressureBar: 200,
    contents: [
      { item: "Multi-stage stage seals", qty: 4 },
      { item: "Heavy-duty wiper rings", qty: 4 },
      { item: "Guide rings", qty: 4 },
      { item: "Top cap O-ring", qty: 1 },
    ],
    fits: ["Hyva FE-162-4 tipper / skip cylinders"],
    crossRefs: [{ source: "Hallite", part: "FE-162-4" }],
    price: 95,
    fpePrice: 135,
    stock: 9,
    madeIn: "India",
  },
  {
    sku: "DRG-PU-HYVA-141-3",
    name: "Hyva FE-141-3 Tipper Cylinder Seal Kit",
    brand: "Hyva",
    brandSlug: "hyva",
    model: "FE-141-3 Tipper",
    position: "Tipper cylinder",
    rod: 141,
    bore: 180,
    height: 15,
    material: "PU",
    hardnessShoreA: 92,
    tempMinC: -30,
    tempMaxC: 110,
    pressureBar: 200,
    contents: [
      { item: "Multi-stage stage seals", qty: 3 },
      { item: "Scraper rings", qty: 3 },
      { item: "Guide bands", qty: 3 },
      { item: "Top cap O-ring", qty: 1 },
    ],
    fits: ["Hyva FE-141-3 tipper / skip cylinders"],
    crossRefs: [{ source: "Hallite", part: "FE-141-3" }],
    price: 70,
    fpePrice: 98,
    stock: 15,
    madeIn: "India",
  },
  {
    sku: "DRG-PU-HYVA-120-3",
    name: "Hyva FE-120-3 Tipper Cylinder Seal Kit",
    brand: "Hyva",
    brandSlug: "hyva",
    model: "FE-120-3 Tipper",
    position: "Tipper cylinder",
    rod: 120,
    bore: 155,
    height: 15,
    material: "PU",
    hardnessShoreA: 92,
    tempMinC: -30,
    tempMaxC: 110,
    pressureBar: 200,
    contents: [
      { item: "Multi-stage stage seals", qty: 3 },
      { item: "Wiper seals", qty: 3 },
      { item: "Guide rings", qty: 3 },
      { item: "Cap O-ring", qty: 1 },
    ],
    fits: ["Hyva FE-120-3 tipper / skip cylinders"],
    crossRefs: [{ source: "Hallite", part: "FE-120-3" }],
    price: 59,
    fpePrice: 84.5,
    stock: 19,
    madeIn: "India",
  },

  // ---- Kubota KX016-4 ----
  {
    sku: "DRG-PU-KX016-ARM",
    name: "Kubota KX016-4 Arm Cylinder Seal Kit",
    brand: "Kubota",
    brandSlug: "kubota",
    model: "KX016-4",
    position: "Arm",
    rod: 35,
    bore: 60,
    height: 7,
    material: "PU",
    hardnessShoreA: 90,
    tempMinC: -30,
    tempMaxC: 110,
    pressureBar: 250,
    contents: STD_CONTENTS,
    fits: ["Kubota KX016-4"],
    crossRefs: [{ source: "FPE", part: "FPE-KX016-35-60" }],
    price: 15,
    fpePrice: 21.9,
    stock: 25,
    madeIn: "India",
  },
  {
    sku: "DRG-PU-KX016-BOOM",
    name: "Kubota KX016-4 Boom Cylinder Seal Kit",
    brand: "Kubota",
    brandSlug: "kubota",
    model: "KX016-4",
    position: "Boom",
    rod: 30,
    bore: 60,
    height: 7,
    material: "PU",
    hardnessShoreA: 90,
    tempMinC: -30,
    tempMaxC: 110,
    pressureBar: 250,
    contents: STD_CONTENTS,
    fits: ["Kubota KX016-4"],
    crossRefs: [{ source: "FPE", part: "FPE-KX016-30-60" }],
    price: 14,
    fpePrice: 20.5,
    stock: 20,
    madeIn: "India",
  },
  {
    sku: "DRG-PU-KX016-BUCKET",
    name: "Kubota KX016-4 Bucket Cylinder Seal Kit",
    brand: "Kubota",
    brandSlug: "kubota",
    model: "KX016-4",
    position: "Bucket",
    rod: 35,
    bore: 60,
    height: 7,
    material: "PU",
    hardnessShoreA: 90,
    tempMinC: -30,
    tempMaxC: 110,
    pressureBar: 250,
    contents: STD_CONTENTS,
    fits: ["Kubota KX016-4"],
    crossRefs: [{ source: "FPE", part: "FPE-KX016-35-60B" }],
    price: 15,
    fpePrice: 21.9,
    stock: 17,
    madeIn: "India",
  },

  // ---- Takeuchi ----
  {
    sku: "DRG-NBR-TB250-BOOM",
    name: "Takeuchi TB250 Boom Cylinder Seal Kit",
    brand: "Takeuchi",
    brandSlug: "takeuchi",
    model: "TB250",
    position: "Boom",
    rod: 55,
    bore: 100,
    height: 9,
    material: "NBR",
    hardnessShoreA: 85,
    tempMinC: -30,
    tempMaxC: 100,
    pressureBar: 250,
    contents: STD_CONTENTS,
    fits: ["Takeuchi TB250"],
    crossRefs: [{ source: "FPE", part: "FPE-TB250-55-100" }],
    price: 22,
    fpePrice: 31.5,
    stock: 14,
    madeIn: "India",
  },
  {
    sku: "DRG-NBR-TB230-BOOM",
    name: "Takeuchi TB230 / TB325R Boom Cylinder Seal Kit",
    brand: "Takeuchi",
    brandSlug: "takeuchi",
    model: "TB230 / TB325R",
    position: "Boom",
    rod: 45,
    bore: 85,
    height: 8,
    material: "NBR",
    hardnessShoreA: 85,
    tempMinC: -30,
    tempMaxC: 100,
    pressureBar: 250,
    contents: STD_CONTENTS,
    fits: ["Takeuchi TB230", "Takeuchi TB325R"],
    crossRefs: [{ source: "FPE", part: "FPE-TB230-45-85" }],
    price: 20,
    fpePrice: 28.5,
    stock: 16,
    madeIn: "India",
  },
  {
    sku: "DRG-NBR-TB230-BLADE",
    name: "Takeuchi TB230 / TB325R Blade Cylinder Seal Kit",
    brand: "Takeuchi",
    brandSlug: "takeuchi",
    model: "TB230 / TB325R",
    position: "Blade",
    rod: 45,
    bore: 85,
    height: 8,
    material: "NBR",
    hardnessShoreA: 85,
    tempMinC: -30,
    tempMaxC: 100,
    pressureBar: 250,
    contents: STD_CONTENTS,
    fits: ["Takeuchi TB230", "Takeuchi TB325R"],
    crossRefs: [{ source: "FPE", part: "FPE-TB230-BL" }],
    price: 20,
    fpePrice: 28.5,
    stock: 13,
    madeIn: "India",
  },

  // ---- Hyundai R210LC-9 ----
  {
    sku: "DRG-PU-R210-BOOM",
    name: "Hyundai R210LC-9 Boom Cylinder Seal Kit",
    brand: "Hyundai",
    brandSlug: "hyundai",
    model: "R210LC-9",
    position: "Boom",
    rod: 85,
    bore: 120,
    height: 12,
    material: "PU",
    hardnessShoreA: 92,
    tempMinC: -30,
    tempMaxC: 110,
    pressureBar: 320,
    contents: STD_CONTENTS,
    fits: ["Hyundai R210LC-9", "Hyundai R220LC-9"],
    crossRefs: [{ source: "FPE", part: "FPE-R210-85-120" }],
    price: 30,
    fpePrice: 43,
    stock: 10,
    madeIn: "India",
  },
  {
    sku: "DRG-PU-R210-ARM",
    name: "Hyundai R210LC-9 Arm Cylinder Seal Kit",
    brand: "Hyundai",
    brandSlug: "hyundai",
    model: "R210LC-9",
    position: "Arm",
    rod: 100,
    bore: 140,
    height: 14,
    material: "PU",
    hardnessShoreA: 92,
    tempMinC: -30,
    tempMaxC: 110,
    pressureBar: 320,
    contents: STD_CONTENTS,
    fits: ["Hyundai R210LC-9", "Hyundai R220LC-9"],
    crossRefs: [{ source: "FPE", part: "FPE-R210-100-140" }],
    price: 34,
    fpePrice: 48,
    stock: 8,
    madeIn: "India",
  },
  {
    sku: "DRG-PU-R210-BUCKET",
    name: "Hyundai R210LC-9 Bucket Cylinder Seal Kit",
    brand: "Hyundai",
    brandSlug: "hyundai",
    model: "R210LC-9",
    position: "Bucket",
    rod: 85,
    bore: 120,
    height: 12,
    material: "PU",
    hardnessShoreA: 92,
    tempMinC: -30,
    tempMaxC: 110,
    pressureBar: 320,
    contents: STD_CONTENTS,
    fits: ["Hyundai R210LC-9"],
    crossRefs: [{ source: "FPE", part: "FPE-R210-BK" }],
    price: 30,
    fpePrice: 43,
    stock: 9,
    madeIn: "India",
  },

  // ---- Bobcat E50Z / E55Z ----
  {
    sku: "DRG-PU-E50-BOOM",
    name: "Bobcat E50Z / E55Z Boom Cylinder Seal Kit",
    brand: "Bobcat",
    brandSlug: "bobcat",
    model: "E50Z / E55Z",
    position: "Boom",
    rod: 57,
    bore: 102,
    height: 10,
    material: "PU",
    hardnessShoreA: 90,
    tempMinC: -30,
    tempMaxC: 110,
    pressureBar: 280,
    contents: STD_CONTENTS,
    fits: ["Bobcat E50Z", "Bobcat E55Z"],
    crossRefs: [{ source: "FPE", part: "FPE-E50-57-102" }],
    price: 28,
    fpePrice: 39.9,
    stock: 10,
    madeIn: "India",
  },
  {
    sku: "DRG-PU-E50-ARM",
    name: "Bobcat E50Z / E55Z Arm Cylinder Seal Kit",
    brand: "Bobcat",
    brandSlug: "bobcat",
    model: "E50Z / E55Z",
    position: "Arm",
    rod: 57,
    bore: 102,
    height: 10,
    material: "PU",
    hardnessShoreA: 90,
    tempMinC: -30,
    tempMaxC: 110,
    pressureBar: 280,
    contents: STD_CONTENTS,
    fits: ["Bobcat E50Z", "Bobcat E55Z"],
    crossRefs: [{ source: "FPE", part: "FPE-E50-ARM" }],
    price: 28,
    fpePrice: 39.9,
    stock: 8,
    madeIn: "India",
  },
];

// ---------- Helpers ----------

export function savingsPercent(p: Product): number {
  return Math.round((1 - p.price / p.fpePrice) * 100);
}

export function getProduct(sku: string): Product | undefined {
  return products.find((p) => p.sku.toLowerCase() === sku.toLowerCase());
}

export function getByBrandSlug(slug: string): Product[] {
  return products.filter((p) => p.brandSlug === slug);
}

export function relatedProducts(p: Product, limit = 4): Product[] {
  return products
    .filter((x) => x.model === p.model && x.sku !== p.sku)
    .slice(0, limit);
}

export interface BrandInfo {
  name: string;
  slug: string;
  count: number;
}

export function allBrands(): BrandInfo[] {
  const map = new Map<string, BrandInfo>();
  for (const p of products) {
    const existing = map.get(p.brandSlug);
    if (existing) existing.count += 1;
    else map.set(p.brandSlug, { name: p.brand, slug: p.brandSlug, count: 1 });
  }
  return Array.from(map.values());
}

// Finder: derive brand -> model -> position from real products.
export function finderBrandNames(): string[] {
  return Array.from(new Set(products.map((p) => p.brand)));
}

export function finderModels(brand: string): string[] {
  return Array.from(
    new Set(products.filter((p) => p.brand === brand).map((p) => p.model)),
  );
}

export function finderPositions(brand: string, model: string): string[] {
  return Array.from(
    new Set(
      products
        .filter((p) => p.brand === brand && p.model === model)
        .map((p) => p.position),
    ),
  );
}

export function findKit(
  brand: string,
  model: string,
  position: string,
): Product | undefined {
  return products.find(
    (p) => p.brand === brand && p.model === model && p.position === position,
  );
}

// Cross-reference: match a competitor/OEM part number to a Duraforge product.
export function crossRefLookup(query: string): Product | undefined {
  const clean = query.trim().toUpperCase().replace(/[-_/\s]/g, "");
  if (!clean) return undefined;
  return products.find((p) => {
    const skuClean = p.sku.toUpperCase().replace(/[-_/\s]/g, "");
    if (skuClean.includes(clean)) return true;
    return p.crossRefs.some((c) => {
      const refClean = c.part.toUpperCase().replace(/[-_/\s]/g, "");
      return refClean.includes(clean) || clean.includes(refClean);
    });
  });
}

export const materials: Material[] = ["NBR", "PU", "PTFE", "FKM"];

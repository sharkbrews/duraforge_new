import { randomBytes } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { Prisma, PrismaClient } from "@prisma/client";
import type { IdentifierStatus, IdentifierType } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { normaliseCode } from "../src/lib/identifiers";
import { products, type CrossRefSource } from "../src/lib/products";

const prisma = new PrismaClient();

const FPE_MASTER_CSV = join(__dirname, "../../docs/seals_v1.0/csv/fpeseals_products_20260424.csv");
const REGISTER_CSV = join(__dirname, "../../data/sku_register.csv");

async function seedProducts(): Promise<Map<string, string>> {
  const productIds = new Map<string, string>();
  for (const p of products) {
    const purchasePriceGbp = Math.round(p.price * 0.42 * 100) / 100;
    const landingPriceGbp = Math.round(p.price * 0.55 * 100) / 100;
    const purchasePriceInr = Math.round(purchasePriceGbp * 105);

    const row = await prisma.product.upsert({
      where: { sku: p.sku },
      create: {
        sku: p.sku,
        partCode: p.sku,
        name: p.name,
        brand: p.brand,
        brandSlug: p.brandSlug,
        model: p.model,
        position: p.position,
        material: p.material,
        rodMm: p.rod,
        boreMm: p.bore,
        heightMm: p.height,
        hardnessShoreA: p.hardnessShoreA,
        tempMinC: p.tempMinC,
        tempMaxC: p.tempMaxC,
        pressureBar: p.pressureBar,
        contents: p.contents as object,
        fits: p.fits as object,
        crossRefs: p.crossRefs as object,
        salePriceExVat: p.price,
        fpePrice: p.fpePrice,
        purchasePriceInr,
        purchasePriceGbp,
        landingPriceGbp,
        stockQty: p.stock,
        madeIn: p.madeIn,
      },
      update: {
        name: p.name,
        salePriceExVat: p.price,
        fpePrice: p.fpePrice,
        stockQty: p.stock,
        purchasePriceInr,
        purchasePriceGbp,
        landingPriceGbp,
      },
    });
    productIds.set(p.sku, row.id);
  }
  console.log(`Seeded ${products.length} products.`);
  return productIds;
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ?? "admin@duraforge.co.uk";

  // Use an env-provided initial password, or generate a random one printed once.
  // Either way the admin is forced to change it (and enrol MFA) on first login.
  const provided = process.env.ADMIN_INITIAL_PASSWORD?.trim();
  const initialPassword = provided || randomBytes(12).toString("base64url");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "ADMIN") {
      await prisma.user.update({
        where: { email },
        data: { role: "ADMIN" },
      });
      console.log(`Promoted ${email} to ADMIN role.`);
    } else {
      console.log(`Admin user ${email} already exists — left untouched.`);
    }
    return;
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(initialPassword),
      mustChangePassword: true,
      companyName: "Duraforge UK Ltd",
      phone: "+447417309751",
      role: "ADMIN",
      addressLine1: "Swanscombe",
      city: "Swanscombe",
      postcode: "DA10 1BZ",
    },
  });

  console.log(`Created admin user: ${email}`);
  if (provided) {
    console.log("Initial password: (from ADMIN_INITIAL_PASSWORD env var)");
  } else {
    console.log("─────────────────────────────────────────────");
    console.log(`  Initial admin password: ${initialPassword}`);
    console.log("  Change it on first login. This is shown only once.");
    console.log("─────────────────────────────────────────────");
  }
}

async function backfillOrderStatusEvents() {
  const orders = await prisma.order.findMany({
    where: { statusEvents: { none: {} } },
    select: { id: true, status: true, createdAt: true },
  });
  for (const order of orders) {
    await prisma.orderStatusEvent.create({
      data: {
        orderId: order.id,
        status: order.status,
        createdAt: order.createdAt,
      },
    });
  }
  if (orders.length > 0) {
    console.log(`Backfilled status events for ${orders.length} orders.`);
  }
}

async function seedCampaigns() {
  const campaigns = [
    {
      slug: "spring-seals-2026",
      title: "Spring seal season — extra DuraCoins",
      subtitle: "Double coins on JCB & CAT kits through April.",
      body: `Trade-only offer for registered accounts.

Order any JCB or CAT seal kit before 30 April and earn **double DuraCoins** on that order (we'll credit the bonus within 24 hours).

Why now? Spring breakdown season. Machines work harder, seals work harder, you need stock on the van.

• Applies to JCB and CAT branded kits in our catalogue
• Bonus coins credited manually by our team (automated rules coming in Stage 4b)
• Cannot be combined with other discount codes

Questions? WhatsApp us or use the contact form — we're in Swanscombe, not a call centre in another timezone.`,
      ctaLabel: "Shop JCB kits",
      ctaHref: "/shop/jcb",
    },
    {
      slug: "kent-same-day",
      title: "Kent same-day — order before 11am",
      subtitle: "Within 30 miles of Swanscombe. We mean it.",
      body: `If you're in Kent, SE London, or Essex border country and you order before 11am on a working day, we'll get compatible in-stock kits to you same-day where courier capacity allows.

No minimum order. No consumer nonsense. Just seals, fast.

Use the Seal Kit Finder if you're not sure on the kit — or hit Cross-Reference with an FPE / Hallite number and we'll show you the Duraforge equivalent (usually 25–30% cheaper).`,
      ctaLabel: "Open Seal Kit Finder",
      ctaHref: "/finder",
    },
  ];

  for (const c of campaigns) {
    await prisma.campaign.upsert({
      where: { slug: c.slug },
      create: { ...c, isActive: true },
      update: {
        title: c.title,
        subtitle: c.subtitle,
        body: c.body,
        ctaLabel: c.ctaLabel,
        ctaHref: c.ctaHref,
        isActive: true,
      },
    });
  }
  console.log(`Seeded ${campaigns.length} campaigns.`);
}

type IdentifierRow = {
  type: IdentifierType;
  value: string;
  status: IdentifierStatus;
  source: string;
  productId: string | null;
  detail?: Prisma.InputJsonValue;
};

// Minimal RFC 4180 reader: handles quoted commas, doubled quotes and CRLF.
function parseCsv(text: string): Record<string, string>[] {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c !== '"') field += c;
      else if (input[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body
    .filter((r) => r.length > 1 || r[0] !== "")
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

function loadFpeMasterSkus(): Set<string> | null {
  if (!existsSync(FPE_MASTER_CSV)) {
    console.warn(`FPE master list not found (${FPE_MASTER_CSV}); FPE references stay UNVERIFIED.`);
    return null;
  }
  return new Set(parseCsv(readFileSync(FPE_MASTER_CSV, "utf8")).map((r) => normaliseCode(r.sku)));
}

const CROSS_REF_TYPE: Record<Exclude<CrossRefSource, "FPE">, IdentifierType> = {
  Hallite: "CROSS_REF",
  "JCB OEM": "OEM_REF",
  "CAT OEM": "OEM_REF",
};

// Kit identifiers. DF and DRG codes are ours, so VERIFIED. FPE is VERIFIED only if the
// part number exists in the FPE master list; OEM and Hallite numbers stay UNVERIFIED.
function kitIdentifierRows(productIds: Map<string, string | null>, fpeSkus: Set<string> | null): IdentifierRow[] {
  const rows: IdentifierRow[] = [];
  const source = "products.ts (Duraforge catalogue)";
  for (const p of products) {
    const productId = productIds.get(p.sku) ?? null;
    rows.push({ type: "DF_SKU", value: p.dfSku, status: "VERIFIED", source, productId });
    rows.push({ type: "DRG_ALIAS", value: p.sku, status: "VERIFIED", source, productId });
    for (const cr of p.crossRefs) {
      if (cr.source === "FPE") {
        const inMaster = fpeSkus?.has(normaliseCode(cr.part)) ?? false;
        rows.push({
          type: "FPE_REF",
          value: cr.part,
          status: inMaster ? "VERIFIED" : "UNVERIFIED",
          source: "products.ts crossRef (FPE)",
          productId,
          detail: { existsInFpeMaster: inMaster },
        });
      } else {
        rows.push({
          type: CROSS_REF_TYPE[cr.source],
          value: cr.part,
          status: "UNVERIFIED",
          source: `products.ts crossRef (${cr.source})`,
          productId,
          detail: { brand: cr.source },
        });
      }
    }
  }
  return rows;
}

// Royal register rows. Product link is null until a Duraforge product is built from them.
function registerIdentifierRows(): IdentifierRow[] {
  if (!existsSync(REGISTER_CSV)) throw new Error(`SKU register not found: ${REGISTER_CSV}`);
  const rows: IdentifierRow[] = [];
  for (const r of parseCsv(readFileSync(REGISTER_CSV, "utf8"))) {
    if (normaliseCode(r.supplier_code) !== r.supplier_code_norm) {
      throw new Error(`Normalisation mismatch for ${r.df_sku}: ${r.supplier_code}`);
    }
    const source = `Royal catalogue 2026 p.${r.source_page} (data/sku_register.csv)`;
    const detail: Prisma.InputJsonValue = {
      series: r.series,
      material: r.material,
      DN_mm: r.DN_mm,
      dN_mm: r.dN_mm,
      h_mm: r.h_mm,
      H_mm: r.H_mm,
      unit: r.unit,
    };
    rows.push({ type: "DF_SKU", value: r.df_sku, status: "VERIFIED", source, productId: null, detail });
    rows.push({ type: "SUPPLIER_CODE", value: r.supplier_code, status: "VERIFIED", source, productId: null, detail });
    if (r.fpe_status === "DIMENSION_MATCHED" && r.fpe_sku) {
      rows.push({
        type: "FPE_REF",
        value: r.fpe_sku,
        status: "UNVERIFIED",
        source: "Dimension match to FPE master (candidate)",
        productId: null,
        detail: { basis: r.fpe_match_basis },
      });
    }
  }
  return rows;
}

// Fails before any write if two rows would share a (type, normalised) key.
function assertUniqueIdentifiers(rows: IdentifierRow[]) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const normalised = normaliseCode(r.value);
    if (!normalised) throw new Error(`Empty normalised value for ${r.type} "${r.value}"`);
    const key = `${r.type}:${normalised}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const dups = [...counts].filter(([, n]) => n > 1).map(([k]) => k);
  if (dups.length > 0) {
    throw new Error(`${dups.length} duplicate identifiers, e.g. ${dups.slice(0, 10).join(", ")}`);
  }
}

async function seedIdentifiers(rows: IdentifierRow[]) {
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma.$transaction(
      rows.slice(i, i + CHUNK).map((r) => {
        const normalised = normaliseCode(r.value);
        const data = {
          type: r.type,
          value: r.value,
          normalised,
          status: r.status,
          source: r.source,
          productId: r.productId,
          detail: r.detail,
        };
        return prisma.productIdentifier.upsert({
          where: { type_normalised: { type: r.type, normalised } },
          create: data,
          update: data,
        });
      }),
    );
  }
  console.log(`Upserted ${rows.length} identifiers.`);
}

function summariseIdentifiers(rows: IdentifierRow[]) {
  const tally = new Map<string, number>();
  for (const r of rows) {
    const key = `${r.type} ${r.status}`;
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  for (const [key, n] of [...tally].sort()) console.log(`  ${key}: ${n}`);
}

async function main() {
  // Dry run builds and checks identifier rows without touching the database.
  if (process.env.SEED_IDENTIFIERS_DRY_RUN === "1") {
    const noIds = new Map<string, string | null>(products.map((p): [string, null] => [p.sku, null]));
    const rows = [...kitIdentifierRows(noIds, loadFpeMasterSkus()), ...registerIdentifierRows()];
    assertUniqueIdentifiers(rows);
    console.log(`Dry run: ${rows.length} identifier rows, no database writes.`);
    summariseIdentifiers(rows);
    return;
  }

  const productIds = await seedProducts();
  await seedAdmin();
  await seedCampaigns();
  await backfillOrderStatusEvents();

  const rows = [...kitIdentifierRows(productIds, loadFpeMasterSkus()), ...registerIdentifierRows()];
  assertUniqueIdentifiers(rows);
  await seedIdentifiers(rows);
  summariseIdentifiers(rows);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

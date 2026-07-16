import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { products } from "../src/lib/products";

const prisma = new PrismaClient();

async function seedProducts() {
  for (const p of products) {
    const purchasePriceGbp = Math.round(p.price * 0.42 * 100) / 100;
    const landingPriceGbp = Math.round(p.price * 0.55 * 100) / 100;
    const purchasePriceInr = Math.round(purchasePriceGbp * 105);

    await prisma.product.upsert({
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
  }
  console.log(`Seeded ${products.length} products.`);
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
      phone: "01474555555",
      role: "ADMIN",
      addressLine1: "Unit 1, Industrial Estate",
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

async function main() {
  await seedProducts();
  await seedAdmin();
  await backfillOrderStatusEvents();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

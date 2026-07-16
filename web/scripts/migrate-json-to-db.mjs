// One-off migration: import any legacy JSON accounts/orders (from Stage 2's
// file-based store) into Postgres. Idempotent — safe to run more than once.
// Run with: node scripts/migrate-json-to-db.mjs

import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const DATA_DIR = path.join(process.cwd(), "data");

async function readJson(file) {
  try {
    const raw = await readFile(path.join(DATA_DIR, file), "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function main() {
  const users = await readJson("users.json");
  const orders = await readJson("orders.json");

  let usersImported = 0;
  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) continue;
    await prisma.user.create({
      data: {
        id: u.id,
        email: u.email,
        passwordHash: u.passwordHash,
        companyName: u.companyName,
        vatNumber: u.vatNumber ?? null,
        phone: u.phone,
        role: u.role === "admin" ? "ADMIN" : "CUSTOMER",
        addressLine1: u.deliveryAddress.line1,
        addressLine2: u.deliveryAddress.line2 ?? null,
        city: u.deliveryAddress.city,
        county: u.deliveryAddress.county ?? null,
        postcode: u.deliveryAddress.postcode,
        createdAt: u.createdAt ? new Date(u.createdAt) : undefined,
      },
    });
    usersImported++;
  }

  let ordersImported = 0;
  for (const o of orders) {
    const existing = await prisma.order.findUnique({
      where: { orderNumber: o.orderNumber },
    });
    if (existing) continue;
    const ship = o.shippingAddress ?? {};
    await prisma.order.create({
      data: {
        id: o.id,
        orderNumber: o.orderNumber,
        userId: o.userId,
        companyName: o.companyName,
        email: o.email,
        status: String(o.status ?? "received").toUpperCase(),
        subtotalExVat: o.subtotalExVat,
        vatAmount: o.vatAmount,
        totalIncVat: o.totalIncVat,
        paymentMethod: String(o.paymentMethod ?? "card").toUpperCase(),
        shipLine1: ship.line1 ?? "",
        shipLine2: ship.line2 ?? null,
        shipCity: ship.city ?? "",
        shipCounty: ship.county ?? null,
        shipPostcode: ship.postcode ?? "",
        notes: o.notes ?? null,
        createdAt: o.createdAt ? new Date(o.createdAt) : undefined,
        lineItems: {
          create: (o.lineItems ?? []).map((li) => ({
            sku: li.sku,
            name: li.name,
            quantity: li.quantity,
            unitPriceExVat: li.unitPriceExVat,
          })),
        },
      },
    });
    ordersImported++;
  }

  console.log(
    `Migration complete. Users imported: ${usersImported}, Orders imported: ${ordersImported}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

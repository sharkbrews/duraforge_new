import { prisma } from "./prisma";
import type {
  Address,
  Order,
  OrderLineItem,
  PaymentMethod,
  PickPackStatus,
  User,
  UserRole,
} from "./types";
import type {
  Order as DbOrder,
  OrderLineItem as DbOrderLineItem,
  Prisma,
  User as DbUser,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Mappers: Prisma rows -> app-facing types (keeps the rest of the app stable).
// ---------------------------------------------------------------------------

function mapUser(row: DbUser): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    companyName: row.companyName,
    vatNumber: row.vatNumber ?? undefined,
    phone: row.phone,
    role: row.role === "ADMIN" ? "admin" : "customer",
    deliveryAddress: {
      line1: row.addressLine1,
      line2: row.addressLine2 ?? undefined,
      city: row.city,
      county: row.county ?? undefined,
      postcode: row.postcode,
    },
    createdAt: row.createdAt.toISOString(),
  };
}

function mapOrder(row: DbOrder & { lineItems: DbOrderLineItem[] }): Order {
  const address: Address = {
    line1: row.shipLine1,
    line2: row.shipLine2 ?? undefined,
    city: row.shipCity,
    county: row.shipCounty ?? undefined,
    postcode: row.shipPostcode,
  };
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    userId: row.userId,
    companyName: row.companyName,
    email: row.email,
    status: row.status.toLowerCase() as PickPackStatus,
    lineItems: row.lineItems.map((li) => ({
      sku: li.sku,
      name: li.name,
      quantity: li.quantity,
      unitPriceExVat: li.unitPriceExVat,
    })),
    subtotalExVat: row.subtotalExVat,
    vatAmount: row.vatAmount,
    totalIncVat: row.totalIncVat,
    paymentMethod: row.paymentMethod.toLowerCase() as PaymentMethod,
    shippingAddress: address,
    billingAddress: address,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const row = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  return row ? mapUser(row) : undefined;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const row = await prisma.user.findUnique({ where: { id } });
  return row ? mapUser(row) : undefined;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  companyName: string;
  vatNumber?: string;
  phone: string;
  role?: UserRole;
  deliveryAddress: Address;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const row = await prisma.user.create({
    data: {
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      companyName: input.companyName.trim(),
      vatNumber: input.vatNumber?.trim() || null,
      phone: input.phone.trim(),
      role: input.role === "admin" ? "ADMIN" : "CUSTOMER",
      addressLine1: input.deliveryAddress.line1.trim(),
      addressLine2: input.deliveryAddress.line2?.trim() || null,
      city: input.deliveryAddress.city.trim(),
      county: input.deliveryAddress.county?.trim() || null,
      postcode: input.deliveryAddress.postcode.trim().toUpperCase(),
    },
  });
  return mapUser(row);
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function getOrdersForUser(userId: string): Promise<Order[]> {
  const rows = await prisma.order.findMany({
    where: { userId },
    include: { lineItems: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapOrder);
}

export async function getOrderByNumber(
  orderNumber: string,
): Promise<Order | undefined> {
  const row = await prisma.order.findUnique({
    where: { orderNumber },
    include: { lineItems: true },
  });
  return row ? mapOrder(row) : undefined;
}

export interface CreateOrderInput {
  userId: string;
  companyName: string;
  email: string;
  lineItems: OrderLineItem[];
  subtotalExVat: number;
  vatAmount: number;
  totalIncVat: number;
  paymentMethod: PaymentMethod;
  shippingAddress: Address;
  notes?: string;
}

async function nextOrderNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `DRG-ORD-${year}-`;
  const last = await tx.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  const lastNum = last
    ? parseInt(last.orderNumber.replace(prefix, ""), 10)
    : 0;
  const next = Number.isNaN(lastNum) ? 1 : lastNum + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const row = await prisma.$transaction(async (tx) => {
    const orderNumber = await nextOrderNumber(tx);
    return tx.order.create({
      data: {
        orderNumber,
        userId: input.userId,
        companyName: input.companyName,
        email: input.email,
        status: "RECEIVED",
        subtotalExVat: input.subtotalExVat,
        vatAmount: input.vatAmount,
        totalIncVat: input.totalIncVat,
        paymentMethod: input.paymentMethod === "bacs" ? "BACS" : "CARD",
        shipLine1: input.shippingAddress.line1,
        shipLine2: input.shippingAddress.line2 || null,
        shipCity: input.shippingAddress.city,
        shipCounty: input.shippingAddress.county || null,
        shipPostcode: input.shippingAddress.postcode,
        notes: input.notes?.trim() || null,
        lineItems: {
          create: input.lineItems.map((li) => ({
            sku: li.sku,
            name: li.name,
            quantity: li.quantity,
            unitPriceExVat: li.unitPriceExVat,
          })),
        },
      },
      include: { lineItems: true },
    });
  });
  return mapOrder(row);
}

import { prisma } from "./prisma";
import type {
  Address,
  AdminCustomer,
  AdminProduct,
  Campaign,
  Enquiry,
  EnquiryStatus,
  LoyaltySummary,
  Order,
  OrderLineItem,
  OrderStatusEvent,
  PaymentMethod,
  PickPackStatus,
  User,
  UserBadgeEarned,
  UserRole,
} from "./types";
import type {
  Order as DbOrder,
  OrderLineItem as DbOrderLineItem,
  OrderStatusEvent as DbOrderStatusEvent,
  Prisma,
  User as DbUser,
  Enquiry as DbEnquiry,
  Product as DbProduct,
  Campaign as DbCampaign,
} from "@prisma/client";
import { getProduct } from "./products";
import { getBadgeDefinition } from "./badges";
import {
  canSpinThisMonth,
  coinsForOrder,
  currentMonthKey,
  milestoneProgress,
  nextMilestone,
  pickSpinPrize,
  PRO_MEMBER_THRESHOLD,
} from "./loyalty";
import { trackEmailEvent } from "./email-events";

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
    mfaEnabled: row.mfaEnabled,
    mustChangePassword: row.mustChangePassword,
    duraCoinsBalance: row.duraCoinsBalance,
    isProMember: row.isProMember,
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

function mapOrder(
  row: DbOrder & {
    lineItems: DbOrderLineItem[];
    statusEvents?: DbOrderStatusEvent[];
  },
): Order {
  const address: Address = {
    line1: row.shipLine1,
    line2: row.shipLine2 ?? undefined,
    city: row.shipCity,
    county: row.shipCounty ?? undefined,
    postcode: row.shipPostcode,
  };
  const statusEvents: OrderStatusEvent[] = (row.statusEvents ?? [])
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((e) => ({
      status: e.status.toLowerCase() as PickPackStatus,
      note: e.note ?? undefined,
      createdAt: e.createdAt.toISOString(),
    }));

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
    carrier: row.carrier ?? undefined,
    trackingNumber: row.trackingNumber ?? undefined,
    statusUpdatedAt: row.statusUpdatedAt.toISOString(),
    statusEvents,
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

// --- Admin security (Stage 3.5) ---

/** Fetch the raw TOTP secret for verification. Never expose to the client. */
export async function getUserMfaSecret(id: string): Promise<string | null> {
  const row = await prisma.user.findUnique({
    where: { id },
    select: { mfaSecret: true },
  });
  return row?.mfaSecret ?? null;
}

export async function setUserMfaSecret(id: string, secret: string): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: { mfaSecret: secret, mfaEnabled: false },
  });
}

export async function enableUserMfa(id: string): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: { mfaEnabled: true },
  });
}

export async function setUserPassword(
  id: string,
  passwordHash: string,
): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: { passwordHash, mustChangePassword: false },
  });
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
    include: { lineItems: true, statusEvents: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapOrder);
}

export async function getOrderByNumber(
  orderNumber: string,
): Promise<Order | undefined> {
  const row = await prisma.order.findUnique({
    where: { orderNumber },
    include: { lineItems: true, statusEvents: true },
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
    const order = await tx.order.create({
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
        statusEvents: {
          create: { status: "RECEIVED" },
        },
      },
      include: { lineItems: true, statusEvents: true },
    });

    const coins = coinsForOrder(input.totalIncVat);
    if (coins > 0) {
      const updated = await tx.user.update({
        where: { id: input.userId },
        data: { duraCoinsBalance: { increment: coins } },
      });
      if (updated.duraCoinsBalance >= PRO_MEMBER_THRESHOLD && !updated.isProMember) {
        await tx.user.update({
          where: { id: input.userId },
          data: { isProMember: true },
        });
      }
      await tx.duraCoinLedger.create({
        data: {
          userId: input.userId,
          amount: coins,
          reason: `Order ${orderNumber}`,
          orderId: order.id,
        },
      });
    }

    await awardBadgesInTx(tx, input.userId, order);

    return order;
  });

  const coins = coinsForOrder(input.totalIncVat);
  trackEmailEvent("order.placed", {
    email: input.email,
    userId: input.userId,
    orderNumber: row.orderNumber,
    totalIncVat: input.totalIncVat,
  });
  if (coins > 0) {
    trackEmailEvent("duracoins.earned", {
      email: input.email,
      userId: input.userId,
      orderNumber: row.orderNumber,
      coins,
    });
  }

  return mapOrder(row);
}

// ---------------------------------------------------------------------------
// Admin — orders
// ---------------------------------------------------------------------------

export async function getAllOrders(status?: PickPackStatus): Promise<Order[]> {
  const rows = await prisma.order.findMany({
    where: status
      ? {
          status: status.toUpperCase() as
            | "RECEIVED"
            | "PICKING"
            | "PACKED"
            | "DESPATCHED"
            | "DELIVERED",
        }
      : undefined,
    include: { lineItems: true, statusEvents: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapOrder);
}

export interface UpdateOrderStatusInput {
  orderNumber: string;
  status: PickPackStatus;
  carrier?: string;
  trackingNumber?: string;
  note?: string;
}

export async function updateOrderStatus(
  input: UpdateOrderStatusInput,
): Promise<Order | undefined> {
  const dbStatus = input.status.toUpperCase() as
    | "RECEIVED"
    | "PICKING"
    | "PACKED"
    | "DESPATCHED"
    | "DELIVERED";

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { orderNumber: input.orderNumber },
      data: {
        status: dbStatus,
        statusUpdatedAt: new Date(),
        carrier: input.carrier?.trim() || undefined,
        trackingNumber: input.trackingNumber?.trim() || undefined,
      },
      include: { lineItems: true, statusEvents: true },
    });

    await tx.orderStatusEvent.create({
      data: {
        orderId: updated.id,
        status: dbStatus,
        note: input.note?.trim() || null,
      },
    });

    return tx.order.findUnique({
      where: { id: updated.id },
      include: { lineItems: true, statusEvents: true },
    });
  });

  return row ? mapOrder(row) : undefined;
}

// ---------------------------------------------------------------------------
// Admin — products (cost columns included — never expose to customers)
// ---------------------------------------------------------------------------

function mapAdminProduct(row: DbProduct): AdminProduct {
  const marginPct =
    row.salePriceExVat > 0
      ? Math.round(
          ((row.salePriceExVat - row.landingPriceGbp) / row.salePriceExVat) * 100,
        )
      : 0;
  return {
    id: row.id,
    sku: row.sku,
    partCode: row.partCode,
    name: row.name,
    brand: row.brand,
    brandSlug: row.brandSlug,
    model: row.model,
    position: row.position,
    material: row.material,
    salePriceExVat: row.salePriceExVat,
    fpePrice: row.fpePrice,
    purchasePriceInr: row.purchasePriceInr,
    purchasePriceGbp: row.purchasePriceGbp,
    landingPriceGbp: row.landingPriceGbp,
    stockQty: row.stockQty,
    marginPct,
    isActive: row.isActive,
  };
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  const rows = await prisma.product.findMany({
    orderBy: [{ brand: "asc" }, { name: "asc" }],
  });
  return rows.map(mapAdminProduct);
}

// ---------------------------------------------------------------------------
// Enquiries
// ---------------------------------------------------------------------------

function mapEnquiry(row: DbEnquiry): Enquiry {
  return {
    id: row.id,
    name: row.name,
    companyName: row.companyName ?? undefined,
    email: row.email,
    phone: row.phone ?? undefined,
    message: row.message,
    status: row.status.toLowerCase() as EnquiryStatus,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString(),
  };
}

export interface CreateEnquiryInput {
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  message: string;
}

export async function createEnquiry(input: CreateEnquiryInput): Promise<Enquiry> {
  const row = await prisma.enquiry.create({
    data: {
      name: input.name.trim(),
      companyName: input.companyName?.trim() || null,
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      message: input.message.trim(),
    },
  });
  return mapEnquiry(row);
}

export async function getEnquiries(status?: EnquiryStatus): Promise<Enquiry[]> {
  const rows = await prisma.enquiry.findMany({
    where: status
      ? {
          status: status.toUpperCase() as "NEW" | "READ" | "REPLIED" | "ARCHIVED",
        }
      : undefined,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapEnquiry);
}

export async function getEnquiryById(id: string): Promise<Enquiry | undefined> {
  const row = await prisma.enquiry.findUnique({ where: { id } });
  return row ? mapEnquiry(row) : undefined;
}

export async function updateEnquiryStatus(
  id: string,
  status: EnquiryStatus,
): Promise<Enquiry | undefined> {
  const row = await prisma.enquiry.update({
    where: { id },
    data: {
      status: status.toUpperCase() as "NEW" | "READ" | "REPLIED" | "ARCHIVED",
      readAt:
        status === "read" || status === "replied" ? new Date() : undefined,
    },
  });
  return mapEnquiry(row);
}

export async function countNewEnquiries(): Promise<number> {
  return prisma.enquiry.count({ where: { status: "NEW" } });
}

// ---------------------------------------------------------------------------
// Loyalty — DuraCoins, badges, spin (Stage 4)
// ---------------------------------------------------------------------------

function mapCampaign(row: DbCampaign): Campaign {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    body: row.body,
    ctaLabel: row.ctaLabel ?? undefined,
    ctaHref: row.ctaHref ?? undefined,
    isActive: row.isActive,
    startsAt: row.startsAt?.toISOString(),
    endsAt: row.endsAt?.toISOString(),
  };
}

async function awardBadgeIfNew(
  tx: Prisma.TransactionClient,
  userId: string,
  badgeKey: string,
): Promise<boolean> {
  const existing = await tx.userBadge.findUnique({
    where: { userId_badgeKey: { userId, badgeKey } },
  });
  if (existing) return false;
  await tx.userBadge.create({ data: { userId, badgeKey } });
  trackEmailEvent("badge.earned", { userId, badgeKey });
  return true;
}

async function awardBadgesInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  order: DbOrder & { lineItems: DbOrderLineItem[] },
): Promise<void> {
  const orderCount = await tx.order.count({ where: { userId } });
  if (orderCount === 1) {
    await awardBadgeIfNew(tx, userId, "first_seal");
  }
  if (order.totalIncVat >= 500) {
    await awardBadgeIfNew(tx, userId, "big_rig");
  }

  const allOrders = await tx.order.findMany({
    where: { userId },
    include: { lineItems: true },
  });
  const brands = new Set<string>();
  for (const o of allOrders) {
    for (const li of o.lineItems) {
      const p = getProduct(li.sku);
      if (p) brands.add(p.brandSlug);
    }
  }
  if (brands.size >= 5) {
    await awardBadgeIfNew(tx, userId, "machine_whisperer");
  }

  const months = new Set(
    allOrders.map(
      (o) => `${o.createdAt.getFullYear()}-${o.createdAt.getMonth()}`,
    ),
  );
  if (months.size >= 12) {
    await awardBadgeIfNew(tx, userId, "loyal_spanner");
  }
}

export async function getUserBadges(userId: string): Promise<UserBadgeEarned[]> {
  const rows = await prisma.userBadge.findMany({
    where: { userId },
    orderBy: { earnedAt: "desc" },
  });
  return rows.map((r) => ({
    badgeKey: r.badgeKey,
    earnedAt: r.earnedAt.toISOString(),
  }));
}

export async function getLoyaltySummary(userId: string): Promise<LoyaltySummary> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return {
      balance: 0,
      isProMember: false,
      nextMilestone: nextMilestone(0),
      progressPct: 0,
      badges: [],
      canSpin: true,
    };
  }
  const badges = await getUserBadges(userId);
  const balance = user.duraCoinsBalance;
  return {
    balance,
    isProMember: user.isProMember,
    nextMilestone: nextMilestone(balance),
    progressPct: milestoneProgress(balance),
    badges,
    canSpin: canSpinThisMonth(user.lastSpinMonth),
  };
}

export async function spinWheel(userId: string): Promise<{
  prizeKey: string;
  prizeLabel: string;
  bonusCoins?: number;
} | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !canSpinThisMonth(user.lastSpinMonth)) return null;

  const prize = pickSpinPrize();
  const month = currentMonthKey();

  await prisma.$transaction(async (tx) => {
    await tx.spinResult.create({
      data: {
        userId,
        prizeKey: prize.key,
        prizeLabel: prize.label,
      },
    });
    await tx.user.update({
      where: { id: userId },
      data: { lastSpinMonth: month },
    });

    if (prize.key === "coins50" || prize.key === "coins100") {
      const bonus = prize.key === "coins50" ? 50 : 100;
      await tx.user.update({
        where: { id: userId },
        data: { duraCoinsBalance: { increment: bonus } },
      });
      await tx.duraCoinLedger.create({
        data: {
          userId,
          amount: bonus,
          reason: `Spin prize: ${prize.label}`,
        },
      });
    }
  });

  trackEmailEvent("spin.won", {
    userId,
    prizeLabel: prize.label,
    prizeKey: prize.key,
  });

  const bonusCoins =
    prize.key === "coins50" ? 50 : prize.key === "coins100" ? 100 : undefined;

  return {
    prizeKey: prize.key,
    prizeLabel: prize.label,
    bonusCoins,
  };
}

export async function adjustDuraCoins(
  userId: string,
  amount: number,
  reason: string,
): Promise<number> {
  const balance = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { duraCoinsBalance: { increment: amount } },
    });
    await tx.duraCoinLedger.create({
      data: { userId, amount, reason },
    });
    if (updated.duraCoinsBalance >= PRO_MEMBER_THRESHOLD && !updated.isProMember) {
      await tx.user.update({
        where: { id: userId },
        data: { isProMember: true },
      });
    }
    return updated.duraCoinsBalance;
  });
  return balance;
}

export async function getCampaignBySlug(
  slug: string,
): Promise<Campaign | undefined> {
  const row = await prisma.campaign.findUnique({ where: { slug } });
  if (!row || !row.isActive) return undefined;
  const now = new Date();
  if (row.startsAt && row.startsAt > now) return undefined;
  if (row.endsAt && row.endsAt < now) return undefined;
  return mapCampaign(row);
}

export async function getActiveCampaigns(): Promise<Campaign[]> {
  const now = new Date();
  const rows = await prisma.campaign.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return rows
    .filter((row) => {
      if (row.startsAt && row.startsAt > now) return false;
      if (row.endsAt && row.endsAt < now) return false;
      return true;
    })
    .map(mapCampaign);
}

export async function getAdminCustomers(): Promise<AdminCustomer[]> {
  const users = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    include: { _count: { select: { orders: true } }, orders: true },
    orderBy: { createdAt: "desc" },
  });
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    companyName: u.companyName,
    duraCoinsBalance: u.duraCoinsBalance,
    isProMember: u.isProMember,
    orderCount: u._count.orders,
    totalSpentIncVat: u.orders.reduce((s, o) => s + o.totalIncVat, 0),
    createdAt: u.createdAt.toISOString(),
  }));
}

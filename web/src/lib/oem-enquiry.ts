import { prisma } from "@/lib/prisma";

export const OEM_ENQUIRY_MAX_LINES = 200;
export const OEM_ENQUIRY_MAX_QUANTITY = 999;
const MAX_TEXT_LENGTH = 200;
const MAX_NOTE_LENGTH = 1000;

export class OemEnquiryError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type OemEnquiryItemInput = {
  brand: string;
  machineName: string;
  application: string;
  oemPartNumber: string;
  quantity: number;
};

const itemSelect = {
  id: true,
  brand: true,
  machineName: true,
  application: true,
  oemPartNumber: true,
  quantity: true,
} as const;

function readText(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== "string") throw new OemEnquiryError(`${field} is required.`, 400);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_TEXT_LENGTH) {
    throw new OemEnquiryError(`${field} must be 1 to ${MAX_TEXT_LENGTH} characters.`, 400);
  }
  return trimmed;
}

export function parseItemQuantity(value: unknown): number {
  const quantity = typeof value === "number" ? value : Number.NaN;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > OEM_ENQUIRY_MAX_QUANTITY) {
    throw new OemEnquiryError(`Quantity must be a whole number from 1 to ${OEM_ENQUIRY_MAX_QUANTITY}.`, 400);
  }
  return quantity;
}

/** Validates a client-submitted line. Part numbers are kept exactly as printed (trimmed only). */
export function parseItemInput(body: unknown): OemEnquiryItemInput {
  if (!body || typeof body !== "object") throw new OemEnquiryError("Invalid request.", 400);
  const record = body as Record<string, unknown>;
  return {
    brand: readText(record, "brand"),
    machineName: readText(record, "machineName"),
    application: readText(record, "application"),
    oemPartNumber: readText(record, "oemPartNumber"),
    quantity: parseItemQuantity(record.quantity),
  };
}

export function parseNote(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const note = (body as Record<string, unknown>).note;
  if (typeof note !== "string") return null;
  const trimmed = note.trim();
  if (trimmed.length > MAX_NOTE_LENGTH) {
    throw new OemEnquiryError(`Note must be ${MAX_NOTE_LENGTH} characters or fewer.`, 400);
  }
  return trimmed || null;
}

async function findOrCreateDraftId(userId: string): Promise<string> {
  const existing = await prisma.oemEnquiry.findFirst({
    where: { userId, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.oemEnquiry.create({ data: { userId }, select: { id: true } });
  return created.id;
}

/** The customer's open draft (created on first use) plus their most recent submissions. */
export async function getOemEnquiryView(userId: string) {
  const draftId = await findOrCreateDraftId(userId);
  const [draftItems, submissions] = await Promise.all([
    prisma.oemEnquiryItem.findMany({
      where: { enquiryId: draftId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: itemSelect,
    }),
    prisma.oemEnquiry.findMany({
      where: { userId, status: { not: "DRAFT" } },
      orderBy: { submittedAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        note: true,
        submittedAt: true,
        reviewedAt: true,
        items: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: itemSelect },
      },
    }),
  ]);
  return { draft: { id: draftId, items: draftItems }, submissions };
}

/** The reference must exist in the current catalogue. Matching on text (not ids) survives re-imports. */
async function assertCatalogueReference(input: OemEnquiryItemInput) {
  const match = await prisma.oemReference.findFirst({
    where: {
      application: input.application,
      oemPartNumber: input.oemPartNumber,
      machine: { brand: input.brand, displayName: input.machineName },
    },
    select: { id: true },
  });
  if (!match) {
    throw new OemEnquiryError("That reference is not in the OEM Knowledge Base. Search again and add it from the results.", 404);
  }
}

/** Adds a line to the draft, or adds to the quantity if the same reference is already listed. */
export async function addOemEnquiryItem(userId: string, input: OemEnquiryItemInput) {
  await assertCatalogueReference(input);
  const enquiryId = await findOrCreateDraftId(userId);
  const key = {
    enquiryId_brand_machineName_application_oemPartNumber: {
      enquiryId,
      brand: input.brand,
      machineName: input.machineName,
      application: input.application,
      oemPartNumber: input.oemPartNumber,
    },
  };
  const existing = await prisma.oemEnquiryItem.findUnique({ where: key, select: { quantity: true } });
  if (!existing) {
    const lineCount = await prisma.oemEnquiryItem.count({ where: { enquiryId } });
    if (lineCount >= OEM_ENQUIRY_MAX_LINES) {
      throw new OemEnquiryError(`An enquiry can hold up to ${OEM_ENQUIRY_MAX_LINES} lines.`, 400);
    }
  }
  const quantity = Math.min((existing?.quantity ?? 0) + input.quantity, OEM_ENQUIRY_MAX_QUANTITY);
  await prisma.oemEnquiryItem.upsert({
    where: key,
    create: { enquiryId, ...input, quantity },
    update: { quantity },
  });
}

export async function setOemEnquiryItemQuantity(userId: string, itemId: string, quantity: number) {
  const result = await prisma.oemEnquiryItem.updateMany({
    where: { id: itemId, enquiry: { userId, status: "DRAFT" } },
    data: { quantity },
  });
  if (result.count === 0) throw new OemEnquiryError("Enquiry line not found.", 404);
}

export async function removeOemEnquiryItem(userId: string, itemId: string) {
  const result = await prisma.oemEnquiryItem.deleteMany({
    where: { id: itemId, enquiry: { userId, status: "DRAFT" } },
  });
  if (result.count === 0) throw new OemEnquiryError("Enquiry line not found.", 404);
}

export async function clearOemEnquiryDraft(userId: string) {
  await prisma.oemEnquiryItem.deleteMany({ where: { enquiry: { userId, status: "DRAFT" } } });
}

/** Moves the open draft to SUBMITTED for sales review. A new empty draft is created on the next read. */
export async function submitOemEnquiry(userId: string, note: string | null) {
  const draft = await prisma.oemEnquiry.findFirst({
    where: { userId, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
    select: { id: true, _count: { select: { items: true } } },
  });
  if (!draft || draft._count.items === 0) {
    throw new OemEnquiryError("Add at least one part before submitting.", 400);
  }
  const result = await prisma.oemEnquiry.updateMany({
    where: { id: draft.id, status: "DRAFT" },
    data: { status: "SUBMITTED", submittedAt: new Date(), note },
  });
  if (result.count === 0) throw new OemEnquiryError("This enquiry was already submitted.", 409);
  return draft.id;
}

/** Sales queue: submitted enquiries first, then reviewed ones. Drafts are never shown to sales. */
export async function listOemEnquiriesForSales() {
  return prisma.oemEnquiry.findMany({
    where: { status: { not: "DRAFT" } },
    orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
    take: 100,
    select: {
      id: true,
      status: true,
      note: true,
      submittedAt: true,
      reviewedAt: true,
      user: { select: { companyName: true, email: true, phone: true } },
      items: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: itemSelect },
    },
  });
}

export async function markOemEnquiryReviewed(enquiryId: string): Promise<boolean> {
  const result = await prisma.oemEnquiry.updateMany({
    where: { id: enquiryId, status: "SUBMITTED" },
    data: { status: "REVIEWED", reviewedAt: new Date() },
  });
  return result.count === 1;
}

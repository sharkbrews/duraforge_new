import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normaliseCode } from "@/lib/identifiers";

const MIN_QUERY_LENGTH = 3;
const MIN_PREFIX_LENGTH = 4;
const MAX_RESULTS = 25;

// Public fields only: cost and purchase columns are never returned to the browser.
const identifierSelect = {
  type: true,
  value: true,
  status: true,
  product: {
    select: {
      id: true,
      sku: true,
      partCode: true,
      name: true,
      brand: true,
      model: true,
      position: true,
      material: true,
      rodMm: true,
      boreMm: true,
      heightMm: true,
      salePriceExVat: true,
    },
  },
} as const;

export async function GET(request: Request) {
  const q = normaliseCode(new URL(request.url).searchParams.get("q") ?? "");

  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { results: [], error: `Enter at least ${MIN_QUERY_LENGTH} characters.` },
      { status: 400 },
    );
  }

  let results = await prisma.productIdentifier.findMany({
    where: { normalised: q },
    select: identifierSelect,
    take: MAX_RESULTS,
  });

  if (results.length === 0 && q.length >= MIN_PREFIX_LENGTH) {
    results = await prisma.productIdentifier.findMany({
      where: { normalised: { startsWith: q } },
      orderBy: { normalised: "asc" },
      select: identifierSelect,
      take: MAX_RESULTS,
    });
  }

  return NextResponse.json({ results });
}

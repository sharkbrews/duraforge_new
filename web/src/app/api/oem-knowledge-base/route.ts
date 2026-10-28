import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_MACHINES = 20;

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const query = params.get("q")?.trim() ?? "";
    const brand = params.get("brand")?.trim() ?? "";
    const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
    const offset = (page - 1) * MAX_MACHINES;
    if (query.length > 0 && query.length < 2) {
      return NextResponse.json({ machines: [], brands: [], error: "Enter at least 2 characters." }, { status: 400 });
    }
    const normalized = normalize(query);
    const searchPattern = `%${normalized}%`;
    const brandPattern = brand ? `%${normalize(brand)}%` : null;
    const matches = await prisma.$queryRaw<Array<{ machine_id: string; rank: number }>>`
    SELECT e."machineId" AS machine_id,
      MAX(
        CASE WHEN ${normalized} <> '' AND e."normalizedText" = ${normalized} THEN 100 ELSE 0 END +
        CASE WHEN ${normalized} <> '' AND e."normalizedText" LIKE ${searchPattern} THEN 30 ELSE 0 END +
        CASE WHEN ${normalized} <> '' AND to_tsvector('simple', e."content") @@ plainto_tsquery('simple', ${normalized}) THEN 10 ELSE 0 END
      ) AS rank
    FROM "OemSearchEntry" e
    LEFT JOIN "OemMachine" m ON m."id" = e."machineId"
    WHERE e."kind" IN ('machine', 'reference') AND e."machineId" IS NOT NULL
      AND (${normalized} = '' OR e."normalizedText" LIKE ${searchPattern}
      OR to_tsvector('simple', e."content") @@ plainto_tsquery('simple', ${normalized}))
      AND (${brandPattern}::text IS NULL OR lower(COALESCE(m."brand", '')) LIKE ${brandPattern})
    GROUP BY e."machineId"
    ORDER BY rank DESC, MIN(e."title") ASC
    LIMIT ${MAX_MACHINES} OFFSET ${offset}
  `;
    const machineIds = matches.map((match) => match.machine_id);
    const found = machineIds.length
      ? await prisma.oemMachine.findMany({
          where: { id: { in: machineIds } },
          select: {
            id: true,
            brand: true,
            model: true,
            displayName: true,
            sourcePage: true,
            references: { orderBy: [{ application: "asc" }, { oemPartNumber: "asc" }], select: { id: true, application: true, oemPartNumber: true, sourcePage: true } },
          },
        })
      : [];
    const machineById = new Map(found.map((machine) => [machine.id, machine]));
    const brands = await prisma.oemMachine.findMany({
      distinct: ["brand"],
      orderBy: { brand: "asc" },
      select: { brand: true },
    });
    return NextResponse.json({
      machines: machineIds.flatMap((id) => machineById.get(id) ?? []),
      brands: brands.map((item) => item.brand),
      page,
      hasMore: matches.length === MAX_MACHINES,
    });
  } catch (error) {
    console.error("OEM knowledge base search failed:", error);
    return NextResponse.json(
      { machines: [], brands: [], error: "OEM Knowledge Base is unavailable. Apply the database migration and import the catalogue first." },
      { status: 503 },
    );
  }
}

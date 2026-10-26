import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ machineId: string }> }) {
  const { machineId } = await context.params;
  const machine = await prisma.oemMachine.findUnique({
    where: { id: machineId },
    select: {
      id: true,
      brand: true,
      model: true,
      displayName: true,
      sourcePage: true,
      sectionId: true,
      references: { orderBy: [{ application: "asc" }, { oemPartNumber: "asc" }], select: { id: true, application: true, oemPartNumber: true, sourcePage: true } },
      section: { select: { images: { select: { path: true, alt: true, sourcePage: true } } } },
    },
  });
  if (!machine) return NextResponse.json({ error: "Machine not found." }, { status: 404 });

  // A table can list several machines, and OemTable.machineId holds only one, so keep the rows for this machine.
  const sectionTables = machine.sectionId
    ? await prisma.oemTable.findMany({
        where: { sectionId: machine.sectionId },
        orderBy: { tableIndex: "asc" },
        select: { id: true, sourcePage: true, headers: true, rows: true },
      })
    : [];
  const tables = sectionTables
    .map((table) => ({
      ...table,
      rows: (Array.isArray(table.rows) ? table.rows : []).filter(
        (row) => row !== null && typeof row === "object" && !Array.isArray(row) && row.machine === machine.displayName,
      ),
    }))
    .filter((table) => table.rows.length > 0);

  return NextResponse.json({ machine: { ...machine, tables } });
}

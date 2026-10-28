import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

type ImportData = {
  document: { sourcePath: string; title: string; sourceHash: string };
  sections: Array<{ pageNumber: number; content: string; title: string | null; tables: Array<{ sourcePage: number; tableIndex: number; headers: string[]; rows: Array<Record<string, string | number | null>> }>; images: Array<{ sourcePage: number; path: string; alt: string }> }>;
  machines: Array<{ displayName: string; brand: string; model: string | null; sourcePage: number; references: Array<{ application: string; oemPartNumber: string; sourcePage: number }> }>;
  searchEntries?: Array<{ kind: string; title: string; content: string; normalizedText: string; machine?: string; application?: string; oemPartNumber?: string; sourcePage?: number }>;
};

const input = process.argv[2] ?? path.join(__dirname, "emd_excon2025.json");
const prisma = new PrismaClient();

async function main() {
  const data = JSON.parse(await readFile(input, "utf8")) as ImportData;
  const document = await prisma.oemDocument.upsert({
    where: { sourcePath: data.document.sourcePath },
    update: { title: data.document.title, sourceHash: data.document.sourceHash, importedAt: new Date() },
    create: { sourcePath: data.document.sourcePath, title: data.document.title, sourceHash: data.document.sourceHash },
  });
  const sectionRows: Prisma.OemSectionCreateManyInput[] = [];
  const imageRows: Prisma.OemImageCreateManyInput[] = [];
  const tableRows: Prisma.OemTableCreateManyInput[] = [];
  const sectionIds = new Map<number, string>();
  for (const section of data.sections) {
    const sectionId = randomUUID();
    sectionIds.set(section.pageNumber, sectionId);
    sectionRows.push({ id: sectionId, documentId: document.id, pageNumber: section.pageNumber, title: section.title, content: section.content });
    for (const image of section.images) {
      imageRows.push({ sectionId, sourcePage: image.sourcePage, path: image.path, alt: image.alt });
    }
    for (const table of section.tables) {
      tableRows.push({ sectionId, sourcePage: table.sourcePage, tableIndex: table.tableIndex, headers: table.headers, rows: table.rows });
    }
  }

  const machineRows: Prisma.OemMachineCreateManyInput[] = [];
  const referenceRows: Prisma.OemReferenceCreateManyInput[] = [];
  const machineIds = new Map<string, string>();
  const referenceIds = new Map<string, string>();
  for (const machine of data.machines) {
    const machineId = randomUUID();
    machineIds.set(machine.displayName, machineId);
    machineRows.push({ id: machineId, documentId: document.id, sectionId: sectionIds.get(machine.sourcePage), brand: machine.brand, model: machine.model, displayName: machine.displayName, sourcePage: machine.sourcePage });
    for (const reference of machine.references) {
      const referenceId = randomUUID();
      referenceIds.set(`${machine.displayName}|${reference.application}|${reference.oemPartNumber}|${reference.sourcePage}`, referenceId);
      referenceRows.push({ id: referenceId, machineId, application: reference.application, oemPartNumber: reference.oemPartNumber, sourcePage: reference.sourcePage });
    }
  }

  const searchRows: Prisma.OemSearchEntryCreateManyInput[] = (data.searchEntries ?? []).map((entry) => ({
    documentId: document.id,
    sectionId: entry.sourcePage ? sectionIds.get(entry.sourcePage) : undefined,
    machineId: entry.machine ? machineIds.get(entry.machine) : undefined,
    referenceId: entry.machine && entry.application && entry.oemPartNumber && entry.sourcePage
      ? referenceIds.get(`${entry.machine}|${entry.application}|${entry.oemPartNumber}|${entry.sourcePage}`)
      : undefined,
    kind: entry.kind,
    title: entry.title,
    content: entry.content,
    normalizedText: entry.normalizedText,
  }));

  await prisma.$transaction(
    async (tx) => {
      await tx.oemSearchEntry.deleteMany({ where: { documentId: document.id } });
      await tx.oemSection.deleteMany({ where: { documentId: document.id } });
      await tx.oemMachine.deleteMany({ where: { documentId: document.id } });
      await createInChunks(sectionRows, (rows) => tx.oemSection.createMany({ data: rows }));
      await createInChunks(imageRows, (rows) => tx.oemImage.createMany({ data: rows }));
      await createInChunks(tableRows, (rows) => tx.oemTable.createMany({ data: rows }));
      await createInChunks(machineRows, (rows) => tx.oemMachine.createMany({ data: rows }));
      await createInChunks(referenceRows, (rows) => tx.oemReference.createMany({ data: rows }));
      await createInChunks(searchRows, (rows) => tx.oemSearchEntry.createMany({ data: rows }));
    },
    { timeout: 15 * 60 * 1000, maxWait: 60 * 1000 },
  );
  console.log(`Imported ${data.machines.length} machines from ${data.document.sourcePath}`);
}

const CHUNK_SIZE = 1000;

async function createInChunks<T>(rows: T[], create: (chunk: T[]) => Promise<unknown>): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += CHUNK_SIZE) {
    await create(rows.slice(offset, offset + CHUNK_SIZE));
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());

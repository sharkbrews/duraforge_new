CREATE TABLE "OemDocument" (
    "id" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OemDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OemDocument_sourcePath_key" ON "OemDocument"("sourcePath");
CREATE INDEX "OemDocument_sourceHash_idx" ON "OemDocument"("sourceHash");

CREATE TABLE "OemSection" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "title" TEXT,
    "content" TEXT NOT NULL,
    CONSTRAINT "OemSection_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OemSection_documentId_pageNumber_idx" ON "OemSection"("documentId", "pageNumber");

CREATE TABLE "OemMachine" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "sectionId" TEXT,
    "brand" TEXT NOT NULL,
    "model" TEXT,
    "displayName" TEXT NOT NULL,
    "sourcePage" INTEGER,
    CONSTRAINT "OemMachine_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OemMachine_documentId_displayName_key" ON "OemMachine"("documentId", "displayName");
CREATE INDEX "OemMachine_brand_idx" ON "OemMachine"("brand");
CREATE INDEX "OemMachine_model_idx" ON "OemMachine"("model");

CREATE TABLE "OemReference" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "application" TEXT NOT NULL,
    "oemPartNumber" TEXT NOT NULL,
    "sourcePage" INTEGER,
    CONSTRAINT "OemReference_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OemReference_oemPartNumber_idx" ON "OemReference"("oemPartNumber");
CREATE INDEX "OemReference_machineId_application_idx" ON "OemReference"("machineId", "application");

CREATE TABLE "OemTable" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "machineId" TEXT,
    "sourcePage" INTEGER,
    "tableIndex" INTEGER NOT NULL,
    "headers" JSONB NOT NULL,
    "rows" JSONB NOT NULL,
    CONSTRAINT "OemTable_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OemTable_sectionId_tableIndex_key" ON "OemTable"("sectionId", "tableIndex");
CREATE INDEX "OemTable_machineId_idx" ON "OemTable"("machineId");

CREATE TABLE "OemImage" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "sourcePage" INTEGER,
    "path" TEXT NOT NULL,
    "alt" TEXT,
    CONSTRAINT "OemImage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OemImage_sectionId_idx" ON "OemImage"("sectionId");

CREATE TABLE "OemSearchEntry" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "sectionId" TEXT,
    "machineId" TEXT,
    "referenceId" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    CONSTRAINT "OemSearchEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OemSearchEntry_documentId_idx" ON "OemSearchEntry"("documentId");
CREATE INDEX "OemSearchEntry_machineId_idx" ON "OemSearchEntry"("machineId");
CREATE INDEX "OemSearchEntry_referenceId_idx" ON "OemSearchEntry"("referenceId");
CREATE INDEX "OemSearchEntry_fts_idx" ON "OemSearchEntry" USING GIN (to_tsvector('simple', "content"));

CREATE TABLE "OemReferenceMapping" (
    "id" TEXT NOT NULL,
    "oemReferenceId" TEXT NOT NULL,
    "duraforgePartNumber" TEXT,
    "duraforgeIdentifierId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNMAPPED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OemReferenceMapping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OemReferenceMapping_oemReferenceId_duraforgePartNumber_key" ON "OemReferenceMapping"("oemReferenceId", "duraforgePartNumber");
CREATE INDEX "OemReferenceMapping_duraforgePartNumber_idx" ON "OemReferenceMapping"("duraforgePartNumber");
CREATE INDEX "OemReferenceMapping_duraforgeIdentifierId_idx" ON "OemReferenceMapping"("duraforgeIdentifierId");

ALTER TABLE "OemSection" ADD CONSTRAINT "OemSection_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "OemDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OemMachine" ADD CONSTRAINT "OemMachine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "OemDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OemMachine" ADD CONSTRAINT "OemMachine_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "OemSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OemReference" ADD CONSTRAINT "OemReference_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "OemMachine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OemTable" ADD CONSTRAINT "OemTable_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "OemSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OemTable" ADD CONSTRAINT "OemTable_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "OemMachine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OemImage" ADD CONSTRAINT "OemImage_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "OemSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OemSearchEntry" ADD CONSTRAINT "OemSearchEntry_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "OemDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OemSearchEntry" ADD CONSTRAINT "OemSearchEntry_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "OemSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OemSearchEntry" ADD CONSTRAINT "OemSearchEntry_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "OemMachine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OemSearchEntry" ADD CONSTRAINT "OemSearchEntry_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "OemReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OemReferenceMapping" ADD CONSTRAINT "OemReferenceMapping_oemReferenceId_fkey" FOREIGN KEY ("oemReferenceId") REFERENCES "OemReference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

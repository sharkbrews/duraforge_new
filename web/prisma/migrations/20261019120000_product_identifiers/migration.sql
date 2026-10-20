-- Generated offline with prisma migrate diff (schema diff, no database). Adds ProductIdentifier.

-- CreateEnum
CREATE TYPE "IdentifierType" AS ENUM ('DF_SKU', 'DRG_ALIAS', 'SUPPLIER_CODE', 'FPE_REF', 'OEM_REF', 'CROSS_REF', 'GTIN');

-- CreateEnum
CREATE TYPE "IdentifierStatus" AS ENUM ('VERIFIED', 'UNVERIFIED');

-- CreateTable
CREATE TABLE "ProductIdentifier" (
    "id" TEXT NOT NULL,
    "type" "IdentifierType" NOT NULL,
    "value" TEXT NOT NULL,
    "normalised" TEXT NOT NULL,
    "status" "IdentifierStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "source" TEXT NOT NULL,
    "productId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductIdentifier_normalised_idx" ON "ProductIdentifier"("normalised");

-- CreateIndex
CREATE INDEX "ProductIdentifier_productId_idx" ON "ProductIdentifier"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductIdentifier_type_normalised_key" ON "ProductIdentifier"("type", "normalised");

-- AddForeignKey
ALTER TABLE "ProductIdentifier" ADD CONSTRAINT "ProductIdentifier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;


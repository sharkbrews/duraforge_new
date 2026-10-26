-- CreateEnum
CREATE TYPE "OemEnquiryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED');

-- DropForeignKey
ALTER TABLE "OemReferenceMapping" DROP CONSTRAINT "OemReferenceMapping_oemReferenceId_fkey";

-- DropIndex
DROP INDEX "OemReferenceMapping_oemReferenceId_duraforgePartNumber_key";

-- AlterTable
ALTER TABLE "OemReferenceMapping" DROP COLUMN "oemReferenceId",
ADD COLUMN     "brand" TEXT NOT NULL,
ADD COLUMN     "oemPartNumber" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "OemEnquiry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "OemEnquiryStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OemEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OemEnquiryItem" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "machineName" TEXT NOT NULL,
    "application" TEXT NOT NULL,
    "oemPartNumber" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OemEnquiryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OemEnquiry_userId_status_idx" ON "OemEnquiry"("userId", "status");

-- CreateIndex
CREATE INDEX "OemEnquiry_status_submittedAt_idx" ON "OemEnquiry"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "OemEnquiryItem_oemPartNumber_idx" ON "OemEnquiryItem"("oemPartNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OemEnquiryItem_enquiryId_brand_machineName_application_oemP_key" ON "OemEnquiryItem"("enquiryId", "brand", "machineName", "application", "oemPartNumber");

-- CreateIndex
CREATE INDEX "OemReferenceMapping_oemPartNumber_idx" ON "OemReferenceMapping"("oemPartNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OemReferenceMapping_brand_oemPartNumber_duraforgePartNumber_key" ON "OemReferenceMapping"("brand", "oemPartNumber", "duraforgePartNumber");

-- AddForeignKey
ALTER TABLE "OemEnquiry" ADD CONSTRAINT "OemEnquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OemEnquiryItem" ADD CONSTRAINT "OemEnquiryItem_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "OemEnquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;


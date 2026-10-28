-- Loyalty rewards require an explicitly paid and reconciled invoice.
CREATE TYPE "InvoicePaymentStatus" AS ENUM (
  'UNPAID',
  'PARTIALLY_PAID',
  'PAID_PENDING_RECONCILIATION',
  'PAID_RECONCILED'
);

ALTER TABLE "Order"
  ADD COLUMN "paymentStatus" "InvoicePaymentStatus" NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "reconciledAt" TIMESTAMP(3);

-- Record the 30-day trade-terms decision explicitly on each order.
CREATE TYPE "TradeTermsStatus" AS ENUM (
  'PENDING',
  'APPROVED_NET_30',
  'DECLINED'
);

ALTER TABLE "Order"
  ADD COLUMN "tradeTermsStatus" "TradeTermsStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "tradeTermsApprovedAt" TIMESTAMP(3),
  ADD COLUMN "tradeTermsApprovedBy" TEXT;

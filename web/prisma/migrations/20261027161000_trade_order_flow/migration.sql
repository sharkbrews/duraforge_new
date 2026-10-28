-- Enable payment-free trade order requests and an explicit review state.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW' BEFORE 'RECEIVED';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'TRADE_ACCOUNT' BEFORE 'CARD';

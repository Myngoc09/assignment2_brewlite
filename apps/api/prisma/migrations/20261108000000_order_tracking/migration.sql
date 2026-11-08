CREATE TABLE "OrderStatusHistory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "status" "OrderStatus" NOT NULL,
  "note" TEXT,
  "changedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "OrderStatusHistory_orderId_changedAt_idx"
  ON "OrderStatusHistory"("orderId", "changedAt");
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_idempotencyKey_key";
DROP INDEX IF EXISTS "Payment_idempotencyKey_key";
CREATE UNIQUE INDEX "Payment_orderId_idempotencyKey_key"
  ON "Payment"("orderId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "Payment_orderId_createdAt_idx"
  ON "Payment"("orderId", "createdAt");

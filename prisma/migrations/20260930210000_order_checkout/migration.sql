ALTER TABLE "orders"
ADD COLUMN "requestId" TEXT,
ADD COLUMN "requestHash" TEXT,
ADD COLUMN "receipt" JSONB,
ADD COLUMN "deliveryZone" TEXT,
ADD COLUMN "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "promotionName" TEXT,
ADD COLUMN "promotionCode" TEXT;
CREATE UNIQUE INDEX "orders_requestId_key" ON "orders"("requestId");

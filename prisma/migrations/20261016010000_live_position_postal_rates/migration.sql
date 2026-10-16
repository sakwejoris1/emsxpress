-- AlterTable
ALTER TABLE "QuoteRate" ADD COLUMN     "destinationPostalPrefix" TEXT,
ADD COLUMN     "originPostalPrefix" TEXT;

-- CreateTable
CREATE TABLE "ShipmentPosition" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentPosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentPosition_shipmentId_key" ON "ShipmentPosition"("shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentPosition_recordedAt_idx" ON "ShipmentPosition"("recordedAt");

-- AddForeignKey
ALTER TABLE "ShipmentPosition" ADD CONSTRAINT "ShipmentPosition_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

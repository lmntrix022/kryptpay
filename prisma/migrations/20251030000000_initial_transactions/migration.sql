CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "Gateway" AS ENUM ('STRIPE', 'MONEROO');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'SUCCEEDED', 'FAILED');

CREATE TABLE "transactions" (
  "id" UUID PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "amountMinor" BIGINT NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "countryCode" CHAR(2) NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "gatewayUsed" "Gateway" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "providerReference" TEXT,
  "failureCode" TEXT,
  "checkoutPayload" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "transactions_orderId_idx" ON "transactions" ("orderId");
CREATE INDEX "transactions_providerReference_idx" ON "transactions" ("providerReference");
CREATE INDEX "transactions_gatewayUsed_idx" ON "transactions" ("gatewayUsed");

CREATE TABLE "transaction_events" (
  "id" UUID PRIMARY KEY,
  "paymentId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "providerEventId" TEXT,
  "payload" JSONB,
  "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "transaction_events_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "transactions"("id") ON DELETE CASCADE
);

CREATE INDEX "transaction_events_paymentId_occurredAt_idx"
  ON "transaction_events" ("paymentId", "occurredAt");
-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "ApiKeyAuditAction" AS ENUM ('CREATED', 'USED', 'REVOKED', 'REGENERATED');

-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN     "revoked_at" TIMESTAMP(3),
ADD COLUMN     "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "api_key_audit" (
    "id" TEXT NOT NULL,
    "api_key_id" TEXT NOT NULL,
    "action" "ApiKeyAuditAction" NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_key_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_key_audit_api_key_id_occurred_at_idx" ON "api_key_audit"("api_key_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "api_key_audit" ADD CONSTRAINT "api_key_audit_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

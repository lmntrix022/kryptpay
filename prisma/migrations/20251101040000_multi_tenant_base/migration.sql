CREATE TABLE "merchants" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

INSERT INTO "merchants" ("id", "name")
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Merchant');

CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "label" TEXT,
    "key_hash" TEXT NOT NULL,
    "merchant_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "last_used_at" TIMESTAMPTZ,
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "api_keys_key_hash_key" UNIQUE ("key_hash"),
    CONSTRAINT "api_keys_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE
);

CREATE INDEX "api_keys_merchant_id_idx" ON "api_keys" ("merchant_id");

CREATE TABLE "provider_credentials" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "encrypted_data" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT "provider_credentials_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "provider_credentials_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE,
    CONSTRAINT "provider_credentials_merchant_id_provider_environment_key" UNIQUE ("merchant_id", "provider", "environment")
);

ALTER TABLE "transactions" ADD COLUMN "merchant_id" UUID;

UPDATE "transactions" SET "merchant_id" = '00000000-0000-0000-0000-000000000000';

ALTER TABLE "transactions" ALTER COLUMN "merchant_id" SET NOT NULL;

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT;

CREATE INDEX "transactions_merchant_id_idx" ON "transactions" ("merchant_id");

CREATE UNIQUE INDEX "transactions_id_merchant_id_key" ON "transactions" ("id", "merchant_id");



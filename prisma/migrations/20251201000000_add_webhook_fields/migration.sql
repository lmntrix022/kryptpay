-- AlterTable
-- Add webhook_url and webhook_secret columns to merchants table
-- These columns are required for webhook delivery functionality

ALTER TABLE "merchants" 
ADD COLUMN IF NOT EXISTS "webhook_url" TEXT,
ADD COLUMN IF NOT EXISTS "webhook_secret" TEXT;

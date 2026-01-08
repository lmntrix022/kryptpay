-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PAYMENT_STATUS', 'PAYOUT_STATUS', 'REFUND_STATUS', 'SYSTEM_ALERT', 'WEBHOOK_FAILURE', 'CUSTOMER_NOTIFICATION');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED');

-- CreateTable
CREATE TABLE "notification_history" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "metadata" JSONB,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_notification_preferences" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "payment_notifications" BOOLEAN NOT NULL DEFAULT true,
    "payout_notifications" BOOLEAN NOT NULL DEFAULT true,
    "refund_notifications" BOOLEAN NOT NULL DEFAULT true,
    "system_notifications" BOOLEAN NOT NULL DEFAULT true,
    "customer_notifications" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "push_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_history_merchant_id_created_at_idx" ON "notification_history"("merchant_id", "created_at");

-- CreateIndex
CREATE INDEX "notification_history_type_status_idx" ON "notification_history"("type", "status");

-- CreateIndex
CREATE INDEX "notification_history_recipient_idx" ON "notification_history"("recipient");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_notification_preferences_merchant_id_key" ON "merchant_notification_preferences"("merchant_id");

-- AddForeignKey
ALTER TABLE "notification_history" ADD CONSTRAINT "notification_history_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_notification_preferences" ADD CONSTRAINT "merchant_notification_preferences_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;



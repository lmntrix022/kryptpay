#!/bin/bash

# Corriger toutes les relations restantes dans le schema
sed -i '' \
  -e 's/ merchants       @relation/ Merchant       @relation/g' \
  -e 's/ merchants @relation/ Merchant @relation/g' \
  -e 's/ Subscription @relation/ Subscription @relation/g' \
  -e 's/subscriptions   Subscription/subscriptions   Subscription/g' \
  -e 's/transactions           transactions/transactions           Transaction/g' \
  -e 's/payouts                           payouts/payouts                           Payout/g' \
  -e 's/refunds              refunds/refunds              Refund/g' \
  -e 's/vat_transactions                  vat_transactions/vatTransactions                  VatTransaction/g' \
  -e 's/provider_credentials              provider_credentials/providerCredentials              ProviderCredential/g' \
  -e 's/notification_history              notification_history/notificationHistory              NotificationHistory/g' \
  -e 's/saved_filters                     saved_filters/savedFilters                     SavedFilter/g' \
  -e 's/sandbox_webhook_logs              sandbox_webhook_logs/sandboxWebhookLogs              SandboxWebhookLog/g' \
  -e 's/merchant_notification_preferences merchant_notification_preferences/merchantNotificationPreferences MerchantNotificationPreference/g' \
  -e 's/merchant_vat_settings             merchant_vat_settings/merchantVatSettings             MerchantVatSetting/g' \
  -e 's/password_reset_tokens password_reset_tokens/passwordResetTokens PasswordResetToken/g' \
  -e 's/refresh_tokens        refresh_tokens/refreshTokens        RefreshToken/g' \
  -e 's/transaction_events transaction_events/transactionEvents TransactionEvent/g' \
  -e 's/refund_events          refund_events/refundEvents          RefundEvent/g' \
  -e 's/payout_events      payout_events/payoutEvents      PayoutEvent/g' \
  -e 's/dunning_attempts  dunning_attempts/dunningAttempts  DunningAttempt/g' \
  prisma/schema.prisma

echo "✅ Relations corrigées"

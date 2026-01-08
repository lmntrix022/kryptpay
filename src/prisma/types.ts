/**
 * Type aliases for Prisma models
 * These aliases map Prisma snake_case model names to camelCase for better developer experience
 */

import { merchants, merchant_notification_preferences } from '@prisma/client';

// Type aliases (for backward compatibility and better DX)
export type Merchant = merchants;
export type MerchantNotificationPreferences = merchant_notification_preferences;

/**
 * Utility functions for merchants Prisma select objects
 * 
 * These utilities help avoid issues when columns don't exist yet in the database
 * (e.g., during migration periods). Once all migrations are applied, you can
 * use `include: { merchants: true }` instead.
 */

import { Prisma } from '@prisma/client';

/**
 * Returns a select object with all merchants columns except optional ones
 * that might not exist yet in the database.
 * 
 * Once the migration for webhook_secret and webhook_url is applied,
 * you can safely use `include: { merchants: true }` instead.
 */
export function getMerchantsSelect(): Prisma.merchantsSelect {
  return {
    id: true,
    name: true,
    created_at: true,
    updated_at: true,
    app_commission_rate: true,
    app_commission_fixed: true,
    // webhook_url and webhook_secret will be added after migration is applied
    // For now, we exclude them to avoid errors
  };
}

/**
 * Returns a select object with all merchants columns including webhook fields.
 * Use this once the migration has been applied to your database.
 */
export function getMerchantsSelectWithWebhooks(): Prisma.merchantsSelect {
  return {
    ...getMerchantsSelect(),
    webhook_url: true,
    webhook_secret: true,
  };
}

/**
 * Returns a select object for users relation
 */
export function getUsersSelect(): Prisma.usersSelect {
  return {
    id: true,
    email: true,
    role: true,
    merchant_id: true,
    created_at: true,
    updated_at: true,
    // password_hash is excluded for security reasons
  };
}

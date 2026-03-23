/**
 * Licence Key System
 *
 * Generates unique keys in format: EDU-PRO-XXXX-XXXX-XXXX
 * Keys are stored in Supabase licence_keys table.
 */

/**
 * Generate a unique, human-readable licence key.
 * Format: EDU-PRO-XXXX-XXXX-XXXX (uppercase alphanumeric)
 */
export function generateLicenceKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No 0/O/1/I to avoid confusion
  const segment = () =>
    Array.from({ length: 4 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("");

  return `EDU-PRO-${segment()}-${segment()}-${segment()}`;
}

// Subscription pricing (for display only — payment handled by Chariow)
export const SUBSCRIPTION_PRICE = 15000;
export const SUBSCRIPTION_CURRENCY = "FCFA";
export const CHARIOW_PRODUCT_URL = process.env.NEXT_PUBLIC_CHARIOW_PRODUCT_URL || "";

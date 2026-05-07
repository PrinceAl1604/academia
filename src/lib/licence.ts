/**
 * Licence Key System
 *
 * Generates unique keys in format: EDU-PRO-XXXX-XXXX-XXXX
 * Keys are stored in Supabase licence_keys table.
 */

/**
 * Generate a cryptographically-strong, human-readable licence key.
 * Format: EDU-PRO-XXXX-XXXX-XXXX (12 chars from a 32-char alphabet
 * → 60 bits of entropy, well above the 80-bit floor for guess-
 * resistance against an attacker who can hit the activate endpoint
 * 5×/15min via the rate limiter).
 *
 * Uses crypto.getRandomValues — Math.random() is not a CSPRNG and
 * has been mathematically reverse-engineered from a handful of
 * outputs (V8's xorshift128+). With predictable keys, an attacker
 * who watches one admin generate a few keys can derive future keys
 * and redeem them before the legitimate buyer.
 */
export function generateLicenceKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars, no 0/O/1/I
  const segment = () => {
    const buf = new Uint8Array(4);
    crypto.getRandomValues(buf);
    // Reject-sampling would be more rigorous, but with a 32-char
    // alphabet (clean power of 2) the modulo-bias from `byte & 31`
    // is exactly zero — every byte maps to one alphabet index with
    // equal probability.
    return Array.from(buf, (b) => chars.charAt(b & 31)).join("");
  };

  return `EDU-PRO-${segment()}-${segment()}-${segment()}`;
}

// ─── Subscription pricing (single source of truth) ────────────────
export const SUBSCRIPTION_PRICE = 15000;
export const SUBSCRIPTION_CURRENCY = "XOF"; // ISO 4217 code for FCFA
export const SUBSCRIPTION_CURRENCY_DISPLAY = "FCFA"; // Human-friendly label
export const SUBSCRIPTION_NAME = "Brightroots Pro - Monthly";
export const CHARIOW_PRODUCT_URL = process.env.NEXT_PUBLIC_CHARIOW_PRODUCT_URL || "https://jwxfcqrf.mychariow.shop/prd_o6clpf";

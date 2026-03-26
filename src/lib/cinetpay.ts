/**
 * Moneroo Payment Integration
 * https://docs.moneroo.io
 *
 * Environment variables needed:
 *   NEXT_PUBLIC_MONEROO_PUBLIC_KEY  — Your Moneroo public key
 *   MONEROO_SECRET_KEY             — Your Moneroo secret key (server-only)
 */

// Subscription pricing
export const SUBSCRIPTION_PRICE = 15000; // FCFA
export const SUBSCRIPTION_CURRENCY = "XOF";
export const SUBSCRIPTION_NAME = "Brightroots Pro - Monthly";

/**
 * Generate a unique transaction ID
 */
export function generateTransactionId(): string {
  return `EDU-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Initialize a Moneroo payment (server-side)
 */
export async function initializePayment({
  amount,
  currency,
  description,
  customerEmail,
  customerName,
  returnUrl,
  metadata,
}: {
  amount: number;
  currency: string;
  description: string;
  customerEmail: string;
  customerName: string;
  returnUrl: string;
  metadata?: Record<string, string>;
}) {
  const response = await fetch("https://api.moneroo.io/v1/payments/initialize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MONEROO_SECRET_KEY}`,
      Accept: "application/json",
    },
    body: JSON.stringify({
      amount,
      currency,
      description,
      customer: {
        email: customerEmail,
        first_name: customerName.split(" ")[0] || customerName,
        last_name: customerName.split(" ").slice(1).join(" ") || "",
      },
      return_url: returnUrl,
      metadata: metadata || {},
    }),
  });

  const data = await response.json();
  return data;
}

/**
 * Verify a Moneroo payment (server-side)
 */
export async function verifyPayment(paymentId: string): Promise<{
  success: boolean;
  status?: string;
  amount?: number;
}> {
  try {
    const response = await fetch(`https://api.moneroo.io/v1/payments/${paymentId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.MONEROO_SECRET_KEY}`,
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (data.data?.status === "success") {
      return {
        success: true,
        status: data.data.status,
        amount: data.data.amount,
      };
    }

    return { success: false, status: data.data?.status };
  } catch {
    return { success: false, status: "verification_error" };
  }
}

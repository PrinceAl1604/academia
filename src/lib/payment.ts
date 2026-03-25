/**
 * Monetbil Payment Integration
 * https://www.monetbil.com
 *
 * Environment variables needed:
 *   NEXT_PUBLIC_MONETBIL_SERVICE_KEY  — Your Monetbil service key
 *   MONETBIL_SERVICE_SECRET           — Your Monetbil service secret (server-only)
 */

// Subscription pricing
export const SUBSCRIPTION_PRICE = 15000; // FCFA
export const SUBSCRIPTION_CURRENCY = "XOF";
export const SUBSCRIPTION_NAME = "Educator Pro - Monthly";

/**
 * Build the Monetbil widget payment URL.
 * Redirects the user to Monetbil's hosted payment page.
 */
export function buildPaymentUrl({
  amount,
  itemRef,
  paymentRef,
  userId,
  email,
  notifyUrl,
  returnUrl,
}: {
  amount: number;
  itemRef: string;
  paymentRef: string;
  userId: string;
  email: string;
  notifyUrl: string;
  returnUrl: string;
}): string {
  const serviceKey = process.env.NEXT_PUBLIC_MONETBIL_SERVICE_KEY || "";

  const params = new URLSearchParams({
    amount: amount.toString(),
    item_ref: itemRef,
    payment_ref: paymentRef,
    user: userId,
    email: email,
    notify_url: notifyUrl,
    return_url: returnUrl,
  });

  return `https://api.monetbil.com/widget/v2.1/${serviceKey}?${params.toString()}`;
}

/**
 * Verify a payment with Monetbil API (server-side).
 * https://api.monetbil.com/payment/v1/checkPayment
 */
export async function verifyPayment(paymentRef: string): Promise<{
  success: boolean;
  status?: number;
  message?: string;
  transaction?: Record<string, unknown>;
}> {
  try {
    const response = await fetch(
      "https://api.monetbil.com/payment/v1/checkPayment",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          paymentId: paymentRef,
          service: process.env.NEXT_PUBLIC_MONETBIL_SERVICE_KEY || "",
        }),
      }
    );

    const data = await response.json();

    // Monetbil status codes:
    // 1 = success (live), 7 = success (test)
    // 0 = failed, -1 = cancelled
    const isSuccess =
      data.transaction?.status === 1 || data.transaction?.status === 7;

    return {
      success: isSuccess,
      status: data.transaction?.status,
      message: data.message,
      transaction: data.transaction,
    };
  } catch {
    return { success: false, message: "verification_error" };
  }
}

/**
 * Generate a unique payment reference.
 */
export function generatePaymentRef(): string {
  return `EDU-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

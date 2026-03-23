/**
 * Magma OnePay Payment Integration
 * https://docs.magmaonepay.com
 *
 * Environment variables needed:
 *   MAGMA_PRIVATE_KEY    — Your Magma OnePay private/bearer key (server-only)
 *   MAGMA_SECRET_KEY     — Your Magma OnePay X-User-Secret key (server-only)
 */

const MAGMA_API_BASE = "https://api.magmaonepay.com/v1";

/**
 * Initialize a payment with Magma OnePay.
 * Returns a payment_url to redirect the user to.
 */
export async function initializeMagmaPayment({
  merchantTransactionId,
  amount,
  currency,
  channel,
  description,
  payeePhone,
  payeeFirstName,
  payeeLastName,
  webhookUrl,
  successUrl,
  errorUrl,
  customField,
}: {
  merchantTransactionId: string;
  amount: number;
  currency: string;
  channel: "mobile_money" | "credit_card" | "wave";
  description?: string;
  payeePhone?: string;
  payeeFirstName?: string;
  payeeLastName?: string;
  webhookUrl?: string;
  successUrl?: string;
  errorUrl?: string;
  customField?: string;
}) {
  const response = await fetch(`${MAGMA_API_BASE}/payment/init`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MAGMA_PRIVATE_KEY}`,
      "X-User-Secret": process.env.MAGMA_SECRET_KEY || "",
    },
    body: JSON.stringify({
      merchant_transaction_id: merchantTransactionId,
      amount,
      currency,
      channel,
      description,
      payee: payeePhone,
      payee_first_name: payeeFirstName,
      payee_last_name: payeeLastName,
      webhook_url: webhookUrl,
      success_url: successUrl,
      error_url: errorUrl,
      custom_field: customField,
    }),
  });

  const data = await response.json();
  return data;
}

/**
 * Check payment status with Magma OnePay.
 */
export async function checkMagmaPaymentStatus(paymentToken: string): Promise<{
  success: boolean;
  status?: string;
  amount?: number;
}> {
  try {
    const response = await fetch(
      `${MAGMA_API_BASE}/payment/status/${paymentToken}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.MAGMA_PRIVATE_KEY}`,
          "X-User-Secret": process.env.MAGMA_SECRET_KEY || "",
        },
      }
    );

    const data = await response.json();
    const status = data.data?.payment_status;

    return {
      success: status === "success",
      status,
      amount: data.data?.amount,
    };
  } catch {
    return { success: false, status: "verification_error" };
  }
}

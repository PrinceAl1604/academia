import { NextResponse } from "next/server";
import { verifyPayment } from "@/lib/cinetpay";
import { verifyWebhookSignature } from "@/lib/webhook-auth";

/**
 * POST /api/payment/notify  (CinetPay webhook)
 *
 * SECURITY: requires HMAC-SHA256 signature in the `x-token` header
 * (CinetPay's convention; if your account uses a different header,
 * adjust below). Without this, attackers could flood the endpoint
 * with fake `cpm_trans_id` values and trigger paid `verifyPayment`
 * calls — DDoS via your CinetPay quota.
 *
 * Set CINETPAY_WEBHOOK_SECRET in env + matching value in the
 * CinetPay merchant dashboard.
 */
export async function POST(request: Request) {
  const verify = await verifyWebhookSignature(request, {
    secretEnv: "CINETPAY_WEBHOOK_SECRET",
    signatureHeader: "x-token",
  });

  if (!verify.ok) {
    console.warn("[CinetPay Webhook] Rejected:", verify.reason);
    return NextResponse.json(
      { status: "unauthorized", reason: verify.reason },
      { status: verify.status }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(verify.rawBody);
  } catch {
    // CinetPay also sends form-encoded sometimes — fall back.
    body = Object.fromEntries(new URLSearchParams(verify.rawBody));
  }

  const transactionId = (body.cpm_trans_id as string) || null;
  if (!transactionId) {
    return NextResponse.json({ status: "missing_transaction_id" });
  }

  const result = await verifyPayment(transactionId);

  console.log("[CinetPay Webhook]", {
    txPrefix: transactionId.slice(0, 8) + "***",
    verified: result.success,
  });

  return NextResponse.json({ status: "received" });
}

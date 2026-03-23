import { NextResponse } from "next/server";
import { verifyPayment } from "@/lib/cinetpay";

/**
 * CinetPay webhook notification endpoint.
 * CinetPay sends a POST here after payment completion.
 * Set this URL in your CinetPay dashboard: https://yourdomain.com/api/payment/notify
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const transactionId = body.cpm_trans_id;

    if (!transactionId) {
      return NextResponse.json({ status: "missing_transaction_id" });
    }

    // Verify with CinetPay API
    const result = await verifyPayment(transactionId);

    // Log for debugging (visible in Vercel logs)
    console.log("[CinetPay Webhook]", {
      transaction_id: transactionId,
      verified: result.success,
      amount: result.amount,
    });

    return NextResponse.json({ status: "received" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

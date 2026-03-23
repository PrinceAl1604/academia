import { NextResponse } from "next/server";
import {
  buildPaymentUrl,
  generatePaymentRef,
  SUBSCRIPTION_PRICE,
  SUBSCRIPTION_NAME,
} from "@/lib/payment";

export async function POST(request: Request) {
  try {
    const { user_id, email } = await request.json();

    if (!user_id || !email) {
      return NextResponse.json(
        { error: "Missing user_id or email" },
        { status: 400 }
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://academia-vert-phi.vercel.app";
    const paymentRef = generatePaymentRef();

    const checkoutUrl = buildPaymentUrl({
      amount: SUBSCRIPTION_PRICE,
      itemRef: SUBSCRIPTION_NAME,
      paymentRef,
      userId: user_id,
      email,
      notifyUrl: `${appUrl}/api/payment/notify`,
      returnUrl: `${appUrl}/payment/success?ref=${paymentRef}`,
    });

    return NextResponse.json({
      checkout_url: checkoutUrl,
      payment_ref: paymentRef,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

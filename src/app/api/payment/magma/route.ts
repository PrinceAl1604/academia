import { NextResponse } from "next/server";
import { initializeMagmaPayment } from "@/lib/magma";
import { SUBSCRIPTION_PRICE, SUBSCRIPTION_CURRENCY, SUBSCRIPTION_NAME, generatePaymentRef } from "@/lib/payment";

export async function POST(request: Request) {
  try {
    const { user_id, email, name, channel } = await request.json();

    if (!user_id || !email) {
      return NextResponse.json(
        { error: "Missing user_id or email" },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://academia-vert-phi.vercel.app";
    const paymentRef = generatePaymentRef();
    const firstName = (name || email.split("@")[0]).split(" ")[0];
    const lastName = (name || "").split(" ").slice(1).join(" ") || "";

    const result = await initializeMagmaPayment({
      merchantTransactionId: paymentRef,
      amount: SUBSCRIPTION_PRICE,
      currency: SUBSCRIPTION_CURRENCY,
      channel: channel || "mobile_money",
      description: SUBSCRIPTION_NAME,
      payeeFirstName: firstName,
      payeeLastName: lastName,
      webhookUrl: `${appUrl}/api/payment/notify`,
      successUrl: `${appUrl}/payment/success?ref=${paymentRef}&provider=magma`,
      errorUrl: `${appUrl}/payment/failed`,
      customField: user_id,
    });

    if (result.data?.payment_url) {
      return NextResponse.json({
        checkout_url: result.data.payment_url,
        payment_ref: paymentRef,
        payment_token: result.data.payment_token,
      });
    }

    return NextResponse.json(
      { error: result.message || "Failed to initialize payment" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

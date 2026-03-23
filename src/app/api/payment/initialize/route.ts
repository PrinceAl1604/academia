import { NextResponse } from "next/server";
import {
  initializePayment,
  SUBSCRIPTION_PRICE,
  SUBSCRIPTION_CURRENCY,
  SUBSCRIPTION_NAME,
} from "@/lib/cinetpay";

export async function POST(request: Request) {
  try {
    const { user_id, email, name } = await request.json();

    if (!user_id || !email) {
      return NextResponse.json(
        { error: "Missing user_id or email" },
        { status: 400 }
      );
    }

    const result = await initializePayment({
      amount: SUBSCRIPTION_PRICE,
      currency: SUBSCRIPTION_CURRENCY,
      description: SUBSCRIPTION_NAME,
      customerEmail: email,
      customerName: name || email.split("@")[0],
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://academia-vert-phi.vercel.app"}/dashboard/subscription?payment=callback`,
      metadata: { user_id },
    });

    if (result.data?.checkout_url) {
      return NextResponse.json({
        checkout_url: result.data.checkout_url,
        payment_id: result.data.id,
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

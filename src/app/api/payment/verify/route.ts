import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyPayment } from "@/lib/cinetpay";
import { sendSubscriptionEmail } from "@/lib/email";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const { payment_id, user_id } = await request.json();

    if (!payment_id || !user_id) {
      return NextResponse.json(
        { error: "Missing payment_id or user_id" },
        { status: 400 }
      );
    }

    // Verify payment with Moneroo
    const result = await verifyPayment(payment_id);

    if (!result.success) {
      return NextResponse.json(
        { error: "Payment not verified", details: result.status },
        { status: 400 }
      );
    }

    // Upgrade user to Pro
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("users")
      .update({
        subscription_tier: "pro",
        last_active_at: new Date().toISOString(),
      })
      .eq("id", user_id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to upgrade user" },
        { status: 500 }
      );
    }

    // Send subscription confirmation email
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("email, name")
      .eq("id", user_id)
      .single();

    if (userData?.email) {
      sendSubscriptionEmail({
        to: userData.email,
        name: userData.name || userData.email.split("@")[0],
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, plan: "pro" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

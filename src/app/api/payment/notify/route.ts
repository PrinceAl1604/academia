import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Monetbil webhook notification endpoint.
 * Monetbil sends a POST here after payment completion.
 * Set this URL in your Monetbil service settings.
 *
 * Monetbil sends: service, transaction_id, phone, amount, currency, status, user, etc.
 * Status: 1 = success, 0 = failed, -1 = cancelled, 7 = success (test)
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const status = Number(formData.get("status"));
    const userId = formData.get("user") as string;
    const amount = formData.get("amount") as string;
    const transactionId = formData.get("transaction_id") as string;

    console.log("[Monetbil Webhook]", {
      status,
      userId,
      amount,
      transactionId,
    });

    // Only upgrade on success (1 = live, 7 = test)
    if ((status === 1 || status === 7) && userId) {
      const supabaseAdmin = getSupabaseAdmin();
      await supabaseAdmin
        .from("users")
        .update({
          subscription_tier: "pro",
          last_active_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }

    return NextResponse.json({ status: "received" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

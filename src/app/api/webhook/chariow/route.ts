import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/webhook/chariow
 *
 * Called by Chariow after a successful purchase.
 * Stores the licence key in the database with status "created".
 * The student will later enter this key to activate Pro.
 *
 * Webhook URL: https://academia-vert-phi.vercel.app/api/webhook/chariow
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Extract data from Chariow payload (try multiple field names)
    const buyerEmail = body.email || body.customer_email || body.buyer_email || null;
    const buyerName = body.name || body.customer_name || body.first_name || null;
    const chariowKey = body.licence_key || body.license_key || body.key || body.product_key || body.code || null;
    const transactionId = body.transaction_id || body.id || body.order_id || null;

    console.log("[Chariow Webhook] Received:", { buyerEmail, buyerName, chariowKey, transactionId });

    if (!chariowKey) {
      return NextResponse.json(
        { error: "Missing licence key in webhook payload" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Store the licence key with status "created"
    const { error } = await supabase.from("licence_keys").insert({
      key: chariowKey.trim().toUpperCase(),
      type: "student",
      status: "created",
      assigned_email: buyerEmail,
      assigned_to: buyerName || (buyerEmail ? buyerEmail.split("@")[0] : null),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) {
      console.error("[Chariow Webhook] DB error:", error);
      return NextResponse.json(
        { error: "Failed to store licence key" },
        { status: 500 }
      );
    }

    console.log("[Chariow Webhook] Key stored:", chariowKey, "status: created");

    return NextResponse.json({
      success: true,
      message: "Licence key registered",
    });
  } catch (err) {
    console.error("[Chariow Webhook] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

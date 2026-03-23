import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateLicenceKey } from "@/lib/licence";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/webhook/chariow
 *
 * Chariow sends a webhook after a successful purchase.
 * This endpoint:
 * 1. Generates a unique licence key
 * 2. Stores it in Supabase (linked to buyer email)
 * 3. Returns the key to Chariow for delivery to the customer
 *
 * Chariow webhook payload typically includes:
 * - email: buyer's email
 * - product_id, product_name
 * - amount, currency
 * - transaction_id
 *
 * Set your webhook URL in Chariow: https://yourdomain.com/api/webhook/chariow
 */
export async function POST(request: Request) {
  try {
    // Verify webhook secret (optional but recommended)
    const webhookSecret = process.env.CHARIOW_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get("x-chariow-signature") ||
                        request.headers.get("x-webhook-secret");
      if (signature !== webhookSecret) {
        console.error("[Chariow Webhook] Invalid signature");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const buyerEmail = body.email || body.customer_email || body.buyer_email;
    const transactionId = body.transaction_id || body.id || body.order_id;
    const productName = body.product_name || body.product || "Pro Subscription";

    if (!buyerEmail) {
      return NextResponse.json(
        { error: "Missing buyer email" },
        { status: 400 }
      );
    }

    // Generate a unique licence key
    const licenceKey = generateLicenceKey();

    // Store in Supabase
    const supabase = getSupabaseAdmin();
    const { error: insertError } = await supabase
      .from("licence_keys")
      .insert({
        key: licenceKey,
        type: "student",
        status: "active",
        assigned_email: buyerEmail,
        assigned_to: buyerEmail.split("@")[0],
        expires_at: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year
        ).toISOString(),
      });

    if (insertError) {
      console.error("[Chariow Webhook] DB insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to generate key" },
        { status: 500 }
      );
    }

    console.log("[Chariow Webhook] Key generated:", {
      email: buyerEmail,
      key: licenceKey,
      transaction: transactionId,
    });

    // Return the key to Chariow for delivery
    // Chariow will include this in the customer's confirmation email
    return NextResponse.json({
      success: true,
      licence_key: licenceKey,
      message: `Your licence key: ${licenceKey}`,
    });
  } catch (err) {
    console.error("[Chariow Webhook] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateLicenceKey } from "@/lib/licence";
import { sendSubscriptionEmail } from "@/lib/email";

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
 * This endpoint:
 * 1. Finds the user by buyer email
 * 2. Auto-upgrades them to Pro (no manual key entry needed)
 * 3. Generates a licence key for record-keeping
 * 4. Sends a confirmation email
 *
 * Set webhook URL in Chariow: https://academia-vert-phi.vercel.app/api/webhook/chariow
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
    const buyerName = body.name || body.customer_name || body.first_name || "";

    console.log("[Chariow Webhook] Received:", { buyerEmail, transactionId, buyerName });

    if (!buyerEmail) {
      return NextResponse.json(
        { error: "Missing buyer email" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Find user by email and auto-upgrade to Pro
    const { data: user } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("email", buyerEmail)
      .single();

    if (user) {
      // User exists — upgrade to Pro
      await supabase
        .from("users")
        .update({
          subscription_tier: "pro",
          last_active_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      console.log("[Chariow Webhook] User upgraded to Pro:", user.email);
    } else {
      console.log("[Chariow Webhook] No user found with email:", buyerEmail, "— key will be stored for later activation");
    }

    // 2. Generate and store licence key (for record-keeping + fallback)
    const licenceKey = generateLicenceKey();
    await supabase.from("licence_keys").insert({
      key: licenceKey,
      type: "student",
      status: user ? "inactive" : "active", // inactive if auto-activated, active if user needs manual activation
      assigned_email: buyerEmail,
      assigned_to: buyerName || buyerEmail.split("@")[0],
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    });

    // 3. Send confirmation email
    if (user) {
      sendSubscriptionEmail({
        to: buyerEmail,
        name: user.name || buyerName || buyerEmail.split("@")[0],
      }).catch(() => {});
    }

    console.log("[Chariow Webhook] Complete:", {
      email: buyerEmail,
      key: licenceKey,
      autoActivated: !!user,
      transaction: transactionId,
    });

    return NextResponse.json({
      success: true,
      licence_key: licenceKey,
      auto_activated: !!user,
      message: user
        ? "Account upgraded to Pro automatically"
        : `Licence key generated: ${licenceKey}`,
    });
  } catch (err) {
    console.error("[Chariow Webhook] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

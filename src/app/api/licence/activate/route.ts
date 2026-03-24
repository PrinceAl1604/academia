import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/licence/activate
 *
 * Flow:
 * 1. Student enters licence key from Chariow
 * 2. App checks: does this key exist in DB with status "created"?
 *    YES → activate Pro 30 days, change status to "active"
 *    NO (already active) → "Key already activated"
 *    NO (not found) → "Invalid key"
 */
export async function POST(request: Request) {
  try {
    const { key, user_id } = await request.json();

    if (!key || !user_id) {
      return NextResponse.json(
        { error: "Missing key or user_id" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const trimmedKey = key.trim().toUpperCase();

    if (trimmedKey.length < 4) {
      return NextResponse.json(
        { error: "Invalid licence key format." },
        { status: 400 }
      );
    }

    // Find the key in database
    const { data: licence } = await supabase
      .from("licence_keys")
      .select("id, status, activated_by")
      .eq("key", trimmedKey)
      .single();

    // Key not found
    if (!licence) {
      return NextResponse.json(
        { error: "Invalid licence key. Please check and try again." },
        { status: 400 }
      );
    }

    // Key already activated
    if (licence.status === "active" && licence.activated_by) {
      return NextResponse.json(
        { error: "This licence key has already been activated." },
        { status: 400 }
      );
    }

    // Key must be in "created" status
    if (licence.status !== "created") {
      return NextResponse.json(
        { error: "This licence key is no longer valid." },
        { status: 400 }
      );
    }

    // Activate the key
    const now = new Date().toISOString();
    const proExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Update key status to "active"
    await supabase
      .from("licence_keys")
      .update({
        status: "active",
        activated_by: user_id,
        activated_at: now,
      })
      .eq("id", licence.id);

    // Upgrade user to Pro
    await supabase
      .from("users")
      .update({
        subscription_tier: "pro",
        pro_expires_at: proExpiresAt,
      })
      .eq("id", user_id);

    // Send confirmation email (non-blocking)
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("email, name")
        .eq("id", user_id)
        .single();

      if (userData?.email) {
        const { sendSubscriptionEmail } = await import("@/lib/email");
        sendSubscriptionEmail({
          to: userData.email,
          name: userData.name || userData.email.split("@")[0],
        }).catch(() => {});
      }
    } catch {}

    return NextResponse.json({
      success: true,
      plan: "pro",
      pro_expires_at: proExpiresAt,
    });
  } catch (err) {
    console.error("[Licence Activate] Error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

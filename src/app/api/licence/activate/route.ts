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
 * Simple flow:
 * 1. Student enters Chariow licence key (format: XXXX-XXXX-XXXX-XXXX)
 * 2. Check if key was already used in our DB
 *    - Already used → "Key already activated"
 *    - New key → save it, activate Pro for 30 days
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

    // Validate format: must have at least 4 characters
    if (trimmedKey.length < 4) {
      return NextResponse.json(
        { error: "Invalid licence key format." },
        { status: 400 }
      );
    }

    // Check if this key was already used
    const { data: existingKey } = await supabase
      .from("licence_keys")
      .select("id, status, activated_by")
      .eq("key", trimmedKey)
      .single();

    if (existingKey && existingKey.activated_by) {
      return NextResponse.json(
        { error: "This licence key has already been activated." },
        { status: 400 }
      );
    }

    // Activate — save key and upgrade user
    const now = new Date().toISOString();
    const proExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    if (existingKey) {
      // Key exists in DB (pre-registered) — update it
      await supabase
        .from("licence_keys")
        .update({
          status: "active",
          activated_by: user_id,
          activated_at: now,
        })
        .eq("id", existingKey.id);
    } else {
      // New key from Chariow — insert it
      await supabase.from("licence_keys").insert({
        key: trimmedKey,
        type: "student",
        status: "active",
        activated_by: user_id,
        activated_at: now,
        expires_at: proExpiresAt,
      });
    }

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

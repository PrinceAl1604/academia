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
 * Student enters a licence key → validates against DB →
 * if key exists with status "created" → upgrade to Pro, change status to "active"
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

    // 1. Find the licence key with status "created"
    const { data: licence, error: findError } = await supabase
      .from("licence_keys")
      .select("*")
      .eq("key", trimmedKey)
      .eq("status", "created")
      .single();

    if (findError || !licence) {
      // Check if key exists but already used
      const { data: usedKey } = await supabase
        .from("licence_keys")
        .select("status")
        .eq("key", trimmedKey)
        .single();

      if (usedKey?.status === "active") {
        return NextResponse.json(
          { error: "This licence key has already been activated." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Invalid licence key. Please check and try again." },
        { status: 400 }
      );
    }

    // 2. Check if expired
    if (licence.expires_at && new Date(licence.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This licence key has expired." },
        { status: 400 }
      );
    }

    // 3. Activate the key — change status to "active"
    const now = new Date().toISOString();
    const proExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    await supabase
      .from("licence_keys")
      .update({
        status: "active",
        activated_by: user_id,
        activated_at: now,
      })
      .eq("id", licence.id);

    // 4. Upgrade the user to Pro
    await supabase
      .from("users")
      .update({
        subscription_tier: "pro",
        pro_expires_at: proExpiresAt,
      })
      .eq("id", user_id);

    // 5. Get user info for email
    const { data: userData } = await supabase
      .from("users")
      .select("email, name")
      .eq("id", user_id)
      .single();

    // 6. Send confirmation email (non-blocking)
    if (userData?.email) {
      try {
        const { sendSubscriptionEmail } = await import("@/lib/email");
        sendSubscriptionEmail({
          to: userData.email,
          name: userData.name || userData.email.split("@")[0],
        }).catch(() => {});
      } catch {}
    }

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

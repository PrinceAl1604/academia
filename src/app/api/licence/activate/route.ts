import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSubscriptionEmail } from "@/lib/email";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/licence/activate
 *
 * Validates a licence key and upgrades the user to Pro.
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

    // Find the licence key
    const { data: licence, error: findError } = await supabase
      .from("licence_keys")
      .select("*")
      .eq("key", trimmedKey)
      .eq("status", "active")
      .single();

    if (findError || !licence) {
      return NextResponse.json(
        { error: "Invalid or already used licence key" },
        { status: 400 }
      );
    }

    // Check expiration
    if (licence.expires_at && new Date(licence.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This licence key has expired" },
        { status: 400 }
      );
    }

    // Upgrade user to Pro
    const { error: updateError } = await supabase
      .from("users")
      .update({
        subscription_tier: "pro",
        licence_key_id: licence.id,
        last_active_at: new Date().toISOString(),
      })
      .eq("id", user_id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to upgrade account" },
        { status: 500 }
      );
    }

    // Mark key as used (change status to inactive so it can't be reused)
    await supabase
      .from("licence_keys")
      .update({
        status: "inactive",
        assigned_to: user_id,
      })
      .eq("id", licence.id);

    // Send confirmation email
    const { data: userData } = await supabase
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

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
 * 1. Student enters a Chariow licence key
 * 2. App calls Chariow API to verify the key is real and valid
 * 3. If valid → activate Pro for 30 days
 * 4. Save the key in our DB to prevent reuse
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
    const trimmedKey = key.trim();

    // 1. Check if key was already used in our DB
    const { data: existingKey } = await supabase
      .from("licence_keys")
      .select("id, status")
      .eq("key", trimmedKey)
      .single();

    if (existingKey) {
      if (existingKey.status === "active") {
        return NextResponse.json(
          { error: "This licence key has already been activated." },
          { status: 400 }
        );
      }
      // If status is "created" (from old flow), allow activation
      if (existingKey.status === "created") {
        return activateKey(supabase, trimmedKey, user_id, existingKey.id);
      }
    }

    // 2. Validate against Chariow API
    const chariowApiKey = process.env.CHARIOW_API_KEY;
    if (!chariowApiKey) {
      // No Chariow API key configured — fall back to accept any key
      console.warn("[Licence] No CHARIOW_API_KEY set, accepting key without Chariow validation");
      return activateKey(supabase, trimmedKey, user_id, null);
    }

    const chariowRes = await fetch(
      `https://api.chariow.com/v1/licenses/${encodeURIComponent(trimmedKey)}`,
      {
        headers: {
          Authorization: `Bearer ${chariowApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!chariowRes.ok) {
      const status = chariowRes.status;
      if (status === 404) {
        return NextResponse.json(
          { error: "Invalid licence key. Please check and try again." },
          { status: 400 }
        );
      }
      console.error("[Licence] Chariow API error:", status);
      // If Chariow is down, accept the key anyway (graceful degradation)
      return activateKey(supabase, trimmedKey, user_id, null);
    }

    const chariowData = await chariowRes.json();
    const licenceData = chariowData.data || chariowData;

    // 3. Check if the key is valid on Chariow's side
    if (licenceData.is_expired === true) {
      return NextResponse.json(
        { error: "This licence key has expired." },
        { status: 400 }
      );
    }

    if (licenceData.is_active === false) {
      return NextResponse.json(
        { error: "This licence key is no longer active." },
        { status: 400 }
      );
    }

    // 4. Try to activate the key on Chariow (mark it as used)
    try {
      await fetch("https://api.chariow.com/v1/licenses/activate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${chariowApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          license_key: trimmedKey,
          instance_name: user_id,
        }),
      });
    } catch {
      // Non-blocking — continue even if Chariow activation fails
    }

    // 5. Activate in our system
    return activateKey(supabase, trimmedKey, user_id, null);
  } catch (err) {
    console.error("[Licence Activate] Error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Shared activation logic — saves key in DB and upgrades user to Pro
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function activateKey(
  supabase: any,
  key: string,
  userId: string,
  existingKeyId: string | null
) {
  const now = new Date().toISOString();
  const proExpiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Save or update the key in our DB
  if (existingKeyId) {
    await supabase
      .from("licence_keys")
      .update({
        status: "active",
        activated_by: userId,
        activated_at: now,
      })
      .eq("id", existingKeyId);
  } else {
    await supabase.from("licence_keys").insert({
      key,
      type: "student",
      status: "active",
      activated_by: userId,
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
    .eq("id", userId);

  // Send confirmation email (non-blocking)
  const { data: userData } = await supabase
    .from("users")
    .select("email, name")
    .eq("id", userId)
    .single();

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
}

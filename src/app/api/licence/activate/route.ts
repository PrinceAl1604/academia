import { NextResponse } from "next/server";
import { validateUserAccess, getSupabaseAdmin } from "@/lib/supabase-server";

// Simple in-memory rate limiter: max 5 attempts per IP per 15 minutes
const attempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    // ─── Server-side auth check ─────────────────────────────────
    const access = await validateUserAccess();
    if (!access.authenticated || !access.user) {
      return NextResponse.json(
        { error: "You must be signed in to activate a licence key." },
        { status: 401 }
      );
    }

    // Rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    const { key } = await request.json();
    // Use the server-validated user ID — never trust client-sent user_id
    const user_id = access.user.id;

    if (!key) {
      return NextResponse.json(
        { error: "Missing licence key" },
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

    // Upgrade user to Pro (upsert — create if missing)
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", user_id)
      .single();

    if (existingUser) {
      await supabase
        .from("users")
        .update({
          subscription_tier: "pro",
          pro_expires_at: proExpiresAt,
        })
        .eq("id", user_id);
    } else {
      // User exists in auth but not in users table — create them
      const { data: authData } = await supabase.auth.admin.getUserById(user_id);
      await supabase.from("users").insert({
        id: user_id,
        email: authData?.user?.email || "",
        name: authData?.user?.user_metadata?.full_name || authData?.user?.email?.split("@")[0] || "",
        role: "student",
        subscription_tier: "pro",
        pro_expires_at: proExpiresAt,
      });
    }

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

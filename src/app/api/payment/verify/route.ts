import { NextResponse } from "next/server";
import { verifyPayment } from "@/lib/cinetpay";
import { sendSubscriptionEmail } from "@/lib/email";
import { validateUserAccess, getSupabaseAdmin } from "@/lib/supabase-server";

/**
 * POST /api/payment/verify
 * Body: { payment_id: string }
 *
 * Called by the subscription page after CinetPay's checkout
 * redirects the user back. Verifies the payment with CinetPay,
 * then upgrades the AUTHENTICATED user to Pro.
 *
 * SECURITY:
 *   - user_id is derived from the server session, never the
 *     request body. Trusting body.user_id let any caller upgrade
 *     any account given one valid payment_id.
 *   - Idempotency: payment_id is unique-keyed in the `payments`
 *     audit table; replays return the existing record without
 *     re-flipping subscription state.
 *   - pro_expires_at is set to now + 30 days. Without an explicit
 *     expiry, Pro never lapses (the cron expiry filter only sees
 *     dates falling inside its window).
 */
const PRO_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const access = await validateUserAccess();
    if (!access.authenticated || !access.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payment_id } = await request.json();
    if (!payment_id || typeof payment_id !== "string") {
      return NextResponse.json(
        { error: "Missing payment_id" },
        { status: 400 }
      );
    }

    const userId = access.user.id;
    const admin = getSupabaseAdmin();

    // Idempotency check: have we already verified this payment?
    const { data: existing } = await admin
      .from("payments")
      .select("id, user_id, status, pro_expires_at")
      .eq("provider", "cinetpay")
      .eq("payment_id", payment_id)
      .maybeSingle();

    if (existing) {
      // Reject if a different user is trying to redeem the same
      // payment id — that's the attack we're guarding against.
      if (existing.user_id !== userId) {
        return NextResponse.json(
          { error: "This payment is registered to another account" },
          { status: 409 }
        );
      }
      // Same user retrying after a network hiccup — return success
      // with the existing expiry. Don't re-extend.
      return NextResponse.json({
        success: true,
        plan: "pro",
        pro_expires_at: existing.pro_expires_at,
        idempotent: true,
      });
    }

    const result = await verifyPayment(payment_id);
    if (!result.success) {
      return NextResponse.json(
        { error: "Payment not verified", details: result.status },
        { status: 400 }
      );
    }

    const now = new Date();
    const proExpiresAt = new Date(now.getTime() + PRO_DURATION_MS).toISOString();

    // Insert the audit row first. Unique constraint on
    // (provider, payment_id) is the idempotency lock — if a
    // concurrent request raced us, this throws and we exit.
    const { error: auditError } = await admin.from("payments").insert({
      provider: "cinetpay",
      payment_id,
      user_id: userId,
      amount: result.amount ?? 0,
      status: "verified",
      pro_expires_at: proExpiresAt,
      raw: result as unknown as Record<string, unknown>,
    });

    if (auditError) {
      // 23505 unique_violation means a concurrent request just
      // wrote the audit row. Re-read and return its expiry.
      if (auditError.code === "23505") {
        const { data: now } = await admin
          .from("payments")
          .select("pro_expires_at")
          .eq("provider", "cinetpay")
          .eq("payment_id", payment_id)
          .maybeSingle();
        if (now) {
          return NextResponse.json({
            success: true,
            plan: "pro",
            pro_expires_at: now.pro_expires_at,
            idempotent: true,
          });
        }
      }
      console.error("[payment/verify] audit insert failed:", auditError);
      return NextResponse.json(
        { error: "Failed to record payment" },
        { status: 500 }
      );
    }

    // Now flip the user. If THIS step fails, the audit row exists
    // but the upgrade didn't apply — admin can replay manually.
    const { error: upErr } = await admin
      .from("users")
      .update({
        subscription_tier: "pro",
        pro_expires_at: proExpiresAt,
        last_active_at: now.toISOString(),
      })
      .eq("id", userId);

    if (upErr) {
      console.error("[payment/verify] user upgrade failed:", upErr);
      return NextResponse.json(
        { error: "Failed to upgrade user" },
        { status: 500 }
      );
    }

    // Confirmation email — fire-and-forget. Failure shouldn't roll
    // back the upgrade.
    const { data: userData } = await admin
      .from("users")
      .select("email, name")
      .eq("id", userId)
      .single();

    if (userData?.email) {
      sendSubscriptionEmail({
        to: userData.email,
        name: userData.name || userData.email.split("@")[0],
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      plan: "pro",
      pro_expires_at: proExpiresAt,
    });
  } catch (err) {
    console.error("[payment/verify] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

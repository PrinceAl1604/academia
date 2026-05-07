import { NextResponse } from "next/server";
import {
  buildPaymentUrl,
  generatePaymentRef,
  SUBSCRIPTION_PRICE,
  SUBSCRIPTION_NAME,
} from "@/lib/payment";
import { validateUserAccess } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/payment/initialize
 * Generates a payment provider checkout URL for the authenticated
 * user. The checkout URL embeds user_id + email — the payment
 * provider passes them back via the notify webhook (and the verify
 * route uses session-derived user_id either way).
 *
 * SECURITY: previously this route had NO auth check and read
 * user_id/email from the request body — any unauthenticated visitor
 * could generate checkout URLs bound to arbitrary user_ids. Even
 * though /api/payment/verify is hardened to derive user_id from
 * session, this endpoint could still be used to flood the payment
 * provider, harvest emails by enumerating UUIDs, or seed payment
 * provider records with attacker-controlled metadata.
 *
 * Now: auth required, user_id and email come from the server session.
 * Rate-limited to 3 inits per minute per user — legitimate flow needs
 * one, occasional retries are fine, but anything beyond that is abuse.
 */
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_SECONDS = 60;

export async function POST() {
  const access = await validateUserAccess();
  if (!access.authenticated || !access.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!access.user.email) {
    return NextResponse.json(
      { error: "Account has no email on file" },
      { status: 400 }
    );
  }

  const allowed = await checkRateLimit({
    bucket: `payment-init:${access.user.id}`,
    maxCount: RATE_LIMIT_MAX,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  try {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://academia-vert-phi.vercel.app";
    const paymentRef = generatePaymentRef();

    const checkoutUrl = buildPaymentUrl({
      amount: SUBSCRIPTION_PRICE,
      itemRef: SUBSCRIPTION_NAME,
      paymentRef,
      // Both fields come from the server-validated session — the
      // request body is ignored, so a client can no longer choose
      // which user_id to bind a payment to.
      userId: access.user.id,
      email: access.user.email,
      notifyUrl: `${appUrl}/api/payment/notify`,
      returnUrl: `${appUrl}/dashboard/subscription?payment=callback&ref=${paymentRef}`,
    });

    return NextResponse.json({
      checkout_url: checkoutUrl,
      payment_ref: paymentRef,
    });
  } catch (err) {
    console.error("[payment/initialize] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

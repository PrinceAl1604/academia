import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhookSignature } from "@/lib/webhook-auth";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/webhook/chariow
 *
 * Called by Chariow after a successful purchase. Stores the licence
 * key with status "created"; the buyer redeems it later via
 * /api/licence/activate.
 *
 * SECURITY: requires HMAC-SHA256 signature in the `x-chariow-signature`
 * header, computed over the raw request body using
 * CHARIOW_WEBHOOK_SECRET (env var). Without this, any internet caller
 * could mint unlimited licence keys.
 *
 * If your Chariow account uses a different header name, update
 * `signatureHeader` below and adjust the dashboard config to match.
 */
export async function POST(request: Request) {
  const verify = await verifyWebhookSignature(request, {
    secretEnv: "CHARIOW_WEBHOOK_SECRET",
    signatureHeader: "x-chariow-signature",
  });

  if (!verify.ok) {
    console.warn("[Chariow Webhook] Rejected:", verify.reason);
    return NextResponse.json(
      { error: verify.reason },
      { status: verify.status }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(verify.rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Try multiple field names — Chariow's payload shape isn't fully
  // pinned down in their docs.
  const buyerEmail =
    (body.email as string) ||
    (body.customer_email as string) ||
    (body.buyer_email as string) ||
    null;
  const buyerName =
    (body.name as string) ||
    (body.customer_name as string) ||
    (body.first_name as string) ||
    null;
  const chariowKey =
    (body.licence_key as string) ||
    (body.license_key as string) ||
    (body.key as string) ||
    (body.product_key as string) ||
    (body.code as string) ||
    null;

  if (!chariowKey) {
    return NextResponse.json(
      { error: "Missing licence key in webhook payload" },
      { status: 400 }
    );
  }

  // PII redaction: don't log raw email/name in production. Hash a
  // short prefix of the email for trace correlation if needed.
  const emailHash = buyerEmail
    ? buyerEmail.slice(0, 3) + "***@" + (buyerEmail.split("@")[1] ?? "?")
    : null;
  console.log("[Chariow Webhook] received", {
    keyPrefix: chariowKey.slice(0, 4) + "***",
    emailHash,
    hasName: !!buyerName,
  });

  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("licence_keys").insert({
    key: chariowKey.trim().toUpperCase(),
    type: "student",
    status: "created",
    assigned_email: buyerEmail,
    assigned_to: buyerName || (buyerEmail ? buyerEmail.split("@")[0] : null),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) {
    console.error("[Chariow Webhook] DB error:", error.message);
    return NextResponse.json(
      { error: "Failed to store licence key" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, message: "Licence key registered" });
}

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Webhook signature verification helper.
 *
 * Both our incoming webhook providers (Chariow, CinetPay) sign the
 * raw request body with HMAC-SHA256 and a shared secret. Behavior
 * we want everywhere:
 *
 *   - Compute HMAC over the *raw* body string. JSON-parsing first
 *     would re-serialize and produce a different byte sequence than
 *     the sender hashed.
 *   - Compare with `timingSafeEqual` so a brute-force search of the
 *     signature can't run a binary search via response timing.
 *   - Reject requests with no signature, the wrong length, or a
 *     mismatch — never "fail open" to "no secret configured" in
 *     production. The dev-only `allowMissingInDev` escape hatch
 *     gates that loosening explicitly.
 *
 * Returns the raw body string on success so the caller can JSON-parse
 * it once, after the auth check, without re-reading from `req.body`
 * (which is single-shot).
 */
export interface WebhookVerifyOptions {
  /** ENV var name for the shared secret, e.g. "CHARIOW_WEBHOOK_SECRET" */
  secretEnv: string;
  /** HTTP header that carries the hex-encoded HMAC, e.g. "x-chariow-signature" */
  signatureHeader: string;
  /**
   * If true and we're not in production AND the secret env var is
   * unset, accept any request. Lets local dev tools (curl, Postman)
   * exercise the route without the signing dance. Defaults false.
   */
  allowMissingInDev?: boolean;
}

export type VerifyResult =
  | { ok: true; rawBody: string }
  | { ok: false; status: number; reason: string };

export async function verifyWebhookSignature(
  request: Request,
  opts: WebhookVerifyOptions
): Promise<VerifyResult> {
  const secret = process.env[opts.secretEnv];
  const provided = request.headers.get(opts.signatureHeader);
  const rawBody = await request.text();

  if (!secret) {
    if (opts.allowMissingInDev && process.env.NODE_ENV !== "production") {
      return { ok: true, rawBody };
    }
    return {
      ok: false,
      status: 503,
      reason: `${opts.secretEnv} not configured`,
    };
  }

  if (!provided) {
    return {
      ok: false,
      status: 401,
      reason: `Missing ${opts.signatureHeader} header`,
    };
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  // Lengths must match before timingSafeEqual or it throws (and the
  // length itself becomes the side channel). Pad-equal first.
  if (expected.length !== provided.length) {
    return { ok: false, status: 401, reason: "Signature length mismatch" };
  }

  const match = timingSafeEqual(
    Buffer.from(expected, "utf8"),
    Buffer.from(provided, "utf8")
  );

  if (!match) {
    return { ok: false, status: 401, reason: "Invalid signature" };
  }

  return { ok: true, rawBody };
}

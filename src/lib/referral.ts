import { getSupabaseAdmin } from "./supabase-server";
import { generateLicenceKey } from "./licence";

/* ─── Code Generation ───────────────────────────────────────── */

/**
 * Generate a unique referral code: first 4 letters of name + 4
 * random alphanumeric. Uses crypto.getRandomValues — Math.random()
 * is not a CSPRNG and the suffix becomes guess-attackable when
 * combined with knowledge of someone's name prefix.
 */
export function generateReferralCode(name: string): string {
  const prefix =
    name
      .replace(/[^a-zA-Z]/g, "")
      .substring(0, 4)
      .toUpperCase() || "USER";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; // 36 chars
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  // 36 doesn't divide 256 evenly — modulo bias is ~1.4% per char.
  // For a 4-char suffix used purely as collision avoidance (with the
  // unique-index retry loop in ensureReferralCode below), this bias
  // is acceptable. A more rigorous approach would reject-sample.
  const suffix = Array.from(buf, (b) => chars.charAt(b % 36)).join("");
  return `${prefix}${suffix}`;
}

/* ─── Referral Stats ────────────────────────────────────────── */

export interface ReferralStats {
  referralCode: string | null;
  totalReferred: number;
  totalRewarded: number;
  totalDaysEarned: number;
}

/** Get referral stats for a given user */
export async function getReferralStats(
  userId: string
): Promise<ReferralStats> {
  const supabase = getSupabaseAdmin();

  const { data: user } = await supabase
    .from("users")
    .select("referral_code")
    .eq("id", userId)
    .single();

  const { data: referrals } = await supabase
    .from("referrals")
    .select("status, reward_days")
    .eq("referrer_id", userId);

  const list = referrals ?? [];

  return {
    referralCode: user?.referral_code ?? null,
    totalReferred: list.length,
    totalRewarded: list.filter((r) => r.status === "rewarded").length,
    totalDaysEarned: list.reduce(
      (sum, r) => sum + (r.reward_days ?? 0),
      0
    ),
  };
}

/* ─── Reward Logic ──────────────────────────────────────────── */

/**
 * When a referred user goes Pro, generate a 1-month licence key
 * for the referrer and send it to them by email.
 *
 * Concurrency: this function is called from /api/payment/verify and
 * /api/licence/activate — both can fire in parallel for the same
 * user (Moneroo retries the notify webhook, user clicks "verify"
 * again, etc.). The previous shape did a SELECT then a separate
 * UPDATE: two concurrent calls would both pass the SELECT (status
 * still 'pending'), both generate a licence key, both send a reward
 * email, and only the second UPDATE would win. The referrer ended
 * up with two free months instead of one.
 *
 * Fix: claim the referral with a single atomic UPDATE that returns
 * the row only if status was 'pending'. If it returns no rows, a
 * concurrent caller already won — bail out without doing any work.
 * Both callers pass the early SELECT, but only one wins the claim.
 */
export async function processReferralReward(referredUserId: string) {
  const supabase = getSupabaseAdmin();

  // 1. Check if this user was referred (cheap early exit)
  const { data: referredUser } = await supabase
    .from("users")
    .select("referred_by")
    .eq("id", referredUserId)
    .single();

  if (!referredUser?.referred_by) return null;

  // 2. Atomically claim the pending referral. RETURNING gives us
  //    back the row only if WE flipped it from 'pending' → 'rewarded'.
  //    Concurrent caller's UPDATE matches no rows (status is no
  //    longer 'pending') and they bail out at step 3 below.
  const claimedAt = new Date().toISOString();
  const { data: claimed } = await supabase
    .from("referrals")
    .update({
      status: "rewarded",
      reward_days: 30,
      rewarded_at: claimedAt,
    })
    .eq("referred_id", referredUserId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (!claimed) return null; // already rewarded or no pending row

  // 3. Now that we own the claim, do the actual work. Side effects
  //    (licence key + email) only fire from the winning caller.
  const { data: referrer } = await supabase
    .from("users")
    .select("email, name")
    .eq("id", referredUser.referred_by)
    .single();

  if (!referrer?.email) {
    // Edge case: referral row claimed but referrer has no email on
    // file. Leave the row as 'rewarded' (the user did refer someone
    // who upgraded), just skip the side effects.
    return null;
  }

  const licenceKey = generateLicenceKey();
  await supabase.from("licence_keys").insert({
    key: licenceKey,
    status: "created",
    created_by: "referral-system",
  });

  // Stamp the licence key onto the (already-rewarded) referral row
  // so the admin dashboard can trace which key went out to whom.
  await supabase
    .from("referrals")
    .update({ licence_key_sent: licenceKey })
    .eq("id", claimed.id);

  try {
    const { sendReferralRewardEmail } = await import("./email");
    await sendReferralRewardEmail({
      to: referrer.email,
      name: referrer.name || referrer.email.split("@")[0],
      licenceKey,
    });
  } catch (err) {
    console.error("[Referral] Failed to send reward email:", err);
  }

  return { licenceKey };
}

/* ─── Link Referred User on Signup ──────────────────────────── */

/**
 * After a new user signs up with a referral code,
 * set their referred_by + create a pending referral record.
 */
export async function linkReferral(
  newUserId: string,
  referralCode: string
) {
  const supabase = getSupabaseAdmin();

  // Find the referrer by code
  const { data: referrer } = await supabase
    .from("users")
    .select("id")
    .eq("referral_code", referralCode.toUpperCase())
    .single();

  if (!referrer || referrer.id === newUserId) return null; // can't refer yourself

  // Set referred_by on the new user
  await supabase
    .from("users")
    .update({ referred_by: referrer.id })
    .eq("id", newUserId);

  // Create a pending referral record
  await supabase.from("referrals").insert({
    referrer_id: referrer.id,
    referred_id: newUserId,
    status: "pending",
    reward_days: 0,
  });

  return referrer.id;
}

/**
 * Ensure a user has a referral code. If they don't, generate one.
 */
export async function ensureReferralCode(
  userId: string,
  name: string
): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from("users")
    .select("referral_code")
    .eq("id", userId)
    .single();

  if (data?.referral_code) return data.referral_code;

  // Generate and save a new code
  let code = generateReferralCode(name);
  let attempts = 0;

  // Retry if code already exists (collision)
  while (attempts < 5) {
    const { error } = await supabase
      .from("users")
      .update({ referral_code: code })
      .eq("id", userId);

    if (!error) return code;
    code = generateReferralCode(name);
    attempts++;
  }

  return code;
}

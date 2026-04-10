import { getSupabaseAdmin } from "./supabase-server";
import { generateLicenceKey } from "./licence";

/* ─── Code Generation ───────────────────────────────────────── */

/** Generate a unique referral code: first 4 letters of name + 4 random alphanumeric */
export function generateReferralCode(name: string): string {
  const prefix =
    name
      .replace(/[^a-zA-Z]/g, "")
      .substring(0, 4)
      .toUpperCase() || "USER";
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
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
 */
export async function processReferralReward(referredUserId: string) {
  const supabase = getSupabaseAdmin();

  // 1. Check if this user was referred
  const { data: referredUser } = await supabase
    .from("users")
    .select("referred_by, pro_expires_at")
    .eq("id", referredUserId)
    .single();

  if (!referredUser?.referred_by) return null; // not a referred user

  // 2. Check if already rewarded
  const { data: existing } = await supabase
    .from("referrals")
    .select("id, status")
    .eq("referred_id", referredUserId)
    .single();

  if (existing?.status === "rewarded") return null; // already processed

  // 3. Get referrer info (need email + name for the reward email)
  const { data: referrer } = await supabase
    .from("users")
    .select("email, name")
    .eq("id", referredUser.referred_by)
    .single();

  if (!referrer?.email) return null;

  // 4. Generate a fresh licence key for the referrer
  const licenceKey = generateLicenceKey();

  await supabase.from("licence_keys").insert({
    key: licenceKey,
    status: "created",
    created_by: "referral-system",
  });

  // 5. Send the reward email with the licence key
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

  // 6. Mark referral as rewarded + store the sent key
  if (existing) {
    await supabase
      .from("referrals")
      .update({
        status: "rewarded",
        reward_days: 30,
        rewarded_at: new Date().toISOString(),
        licence_key_sent: licenceKey,
      })
      .eq("id", existing.id);
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

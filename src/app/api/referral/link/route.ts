import { NextResponse } from "next/server";
import { validateUserAccess, getSupabaseAdmin } from "@/lib/supabase-server";
import { linkReferral } from "@/lib/referral";

/**
 * POST /api/referral/link
 * Links the authenticated user to a referrer via their referral code.
 * Used during onboarding when the user enters a code manually.
 */
export async function POST(request: Request) {
  const access = await validateUserAccess();
  if (!access.authenticated || !access.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await request.json();
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Missing referral code" }, { status: 400 });
  }

  // Check if user is already referred
  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("referred_by")
    .eq("id", access.user.id)
    .single();

  if (user?.referred_by) {
    return NextResponse.json({ error: "Already referred" }, { status: 409 });
  }

  const referrerId = await linkReferral(access.user.id, code.trim());

  if (!referrerId) {
    return NextResponse.json(
      { error: "Invalid referral code" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}

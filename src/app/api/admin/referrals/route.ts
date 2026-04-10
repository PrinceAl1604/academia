import { NextResponse } from "next/server";
import { validateUserAccess, getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  const access = await validateUserAccess();
  if (!access.authenticated || !access.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!access.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();

  const { data: referrals } = await supabase
    .from("referrals")
    .select(`
      id, status, reward_days, created_at, rewarded_at, licence_key_sent,
      referrer:referrer_id(name, email),
      referred:referred_id(name, email)
    `)
    .order("created_at", { ascending: false });

  return NextResponse.json({ referrals: referrals || [] });
}

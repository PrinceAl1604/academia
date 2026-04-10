import { NextResponse } from "next/server";
import { validateUserAccess } from "@/lib/supabase-server";
import { getReferralStats } from "@/lib/referral";

export async function GET() {
  const access = await validateUserAccess();
  if (!access.authenticated || !access.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await getReferralStats(access.user.id);
  return NextResponse.json(stats);
}

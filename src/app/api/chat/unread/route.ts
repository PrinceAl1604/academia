import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * GET /api/chat/unread
 * Returns total unread message count across all channels for the current user.
 * Used by the sidebar badge.
 *
 * One RPC call into chat_unread_total() — replaces the previous N+1
 * fan-out that issued one `count: 'exact'` query per channel and
 * dominated cold-start render time when channel count grew.
 */
export async function GET() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ count: 0 });
  }

  const { data, error } = await supabase.rpc("chat_unread_total");
  if (error) {
    console.error("[chat/unread] rpc failed:", error.message);
    // Fail soft — surface 0 so the badge hides instead of blocking
    // navigation when Postgres hiccups.
    return NextResponse.json({ count: 0 });
  }

  return NextResponse.json({ count: Number(data ?? 0) });
}

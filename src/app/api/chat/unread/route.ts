import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * GET /api/chat/unread
 * Returns total unread message count across all channels for the current user.
 * Used by the sidebar badge.
 */
export async function GET() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ count: 0 });
  }

  // Get user's last read timestamps per channel
  const { data: reads } = await supabase
    .from("chat_reads")
    .select("channel_id, last_read_at")
    .eq("user_id", user.id);

  const readMap = new Map(
    (reads ?? []).map((r) => [r.channel_id, r.last_read_at])
  );

  // Get all channels
  const { data: channels } = await supabase
    .from("chat_channels")
    .select("id");

  let totalUnread = 0;

  // Count unread messages per channel
  for (const ch of channels ?? []) {
    const lastRead = readMap.get(ch.id);
    let query = supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("channel_id", ch.id)
      .eq("is_deleted", false)
      .neq("user_id", user.id);

    if (lastRead) {
      query = query.gt("created_at", lastRead);
    }

    const { count } = await query;
    totalUnread += count ?? 0;
  }

  return NextResponse.json({ count: totalUnread });
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Tracks who's online in the community via Supabase Realtime
 * presence. Returns the live roster (sorted: self first, then
 * alphabetical) so the UI can display "X people online" with the
 * roster as a tooltip.
 *
 * Lifecycle:
 *   - Subscribes once per (userId, userName) tuple. We pass the
 *     name so other clients see something meaningful in the
 *     presence payload.
 *   - "presence sync" event fires whenever anyone joins or leaves;
 *     we recompute the roster from presenceState() each tick.
 *   - Cleanup removes the channel on unmount or when the user
 *     changes (e.g., post-login). Without removeChannel(), the
 *     server holds zombie presence rows until the WebSocket times
 *     out (~30s).
 *
 * Stability: deps are [userId, userName] — both primitive strings
 * so token refreshes (which rebuild the user object hourly) don't
 * tear down + rebuild the channel.
 */
export interface OnlineUser {
  id: string;
  name: string;
}

export function useChannelPresence(userId: string | undefined, userName: string | null | undefined): {
  onlineUsers: OnlineUser[];
  onlineCount: number;
} {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!userId) return;
    const presence = supabase.channel("community_presence", {
      config: { presence: { key: userId } },
    });

    presence
      .on("presence", { event: "sync" }, () => {
        const state = presence.presenceState() as Record<
          string,
          { user_id: string; name: string }[]
        >;
        const list: OnlineUser[] = [];
        for (const key of Object.keys(state)) {
          const meta = state[key]?.[0];
          if (meta) list.push({ id: meta.user_id, name: meta.name || "User" });
        }
        // Self first, then alphabetical — keeps the tooltip stable
        // and predictable.
        list.sort((a, b) => {
          if (a.id === userId) return -1;
          if (b.id === userId) return 1;
          return a.name.localeCompare(b.name);
        });
        setOnlineUsers(list);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presence.track({ user_id: userId, name: userName || "User" });
        }
      });

    return () => {
      supabase.removeChannel(presence);
    };
  }, [userId, userName]);

  return { onlineUsers, onlineCount: onlineUsers.length };
}

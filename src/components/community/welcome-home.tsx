"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PageSpaceView } from "./page-space-view";
import {
  type Community,
  type Space,
  COMMUNITY_COLUMNS,
  SPACE_COLUMNS,
} from "@/lib/community/types";

/**
 * The community Home (`/`) — renders the community's Welcome page. Resolves
 * the welcome space via `communities.welcome_space_id` (falling back to the
 * first `page` space), then renders it with the WhatsApp CTA.
 */
export function WelcomeHome() {
  const [data, setData] = useState<{ space: Space; whatsapp: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: comm } = await supabase
        .from("communities")
        .select(COMMUNITY_COLUMNS)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!comm) {
        if (active) setLoading(false);
        return;
      }
      const community = comm as Community;

      let space: Space | null = null;
      if (community.welcome_space_id) {
        const { data: s } = await supabase
          .from("spaces")
          .select(SPACE_COLUMNS)
          .eq("id", community.welcome_space_id)
          .maybeSingle();
        space = (s as Space) ?? null;
      }
      if (!space) {
        const { data: s } = await supabase
          .from("spaces")
          .select(SPACE_COLUMNS)
          .eq("community_id", community.id)
          .eq("type", "page")
          .order("sort_order", { ascending: true })
          .limit(1)
          .maybeSingle();
        space = (s as Space) ?? null;
      }

      if (!active) return;
      setData(space ? { space, whatsapp: community.whatsapp_url } : null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 text-center text-muted-foreground">
        <p>Bienvenue 👋</p>
      </main>
    );
  }

  return <PageSpaceView space={data.space} whatsappUrl={data.whatsapp} />;
}

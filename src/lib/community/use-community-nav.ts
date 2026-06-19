"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  type Community,
  type SpaceGroup,
  type SpaceNav,
  COMMUNITY_COLUMNS,
  SPACE_NAV_COLUMNS,
} from "./types";

/**
 * Client hook that loads the community sidebar nav (groups → spaces).
 *
 * Reads the `space_nav` view, so it lists every space including `pro` ones
 * (shown locked in the UI for non-Pro members). Content stays gated by the
 * `spaces` table RLS. Module-level cache avoids a flash on the per-page
 * SidebarLayout re-mounts.
 */
let cache: { community: Community | null; groups: SpaceGroup[] } | null = null;

export function useCommunityNav() {
  const [community, setCommunity] = useState<Community | null>(cache?.community ?? null);
  const [groups, setGroups] = useState<SpaceGroup[]>(cache?.groups ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return; // loaded once per session — nav is community-wide
    let active = true;

    (async () => {
      const { data: comm } = await supabase
        .from("communities")
        .select(COMMUNITY_COLUMNS)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!comm) {
        cache = { community: null, groups: [] };
        if (active) setLoading(false);
        return;
      }

      const [{ data: groupRows }, { data: navRows }] = await Promise.all([
        supabase
          .from("space_groups")
          .select("id,community_id,name,emoji,sort_order")
          .eq("community_id", comm.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("space_nav")
          .select(SPACE_NAV_COLUMNS)
          .eq("community_id", comm.id)
          .order("sort_order", { ascending: true }),
      ]);

      const spaces = (navRows ?? []) as SpaceNav[];
      const byGroup = new Map<string, SpaceNav[]>();
      for (const sp of spaces) {
        const key = sp.group_id ?? "_ungrouped";
        const list = byGroup.get(key) ?? [];
        list.push(sp);
        byGroup.set(key, list);
      }
      const nextGroups = ((groupRows ?? []) as Omit<SpaceGroup, "spaces">[]).map((g) => ({
        ...g,
        spaces: byGroup.get(g.id) ?? [],
      }));

      cache = { community: comm as Community, groups: nextGroups };
      if (!active) return;
      setCommunity(cache.community);
      setGroups(cache.groups);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  return { community, groups, loading };
}

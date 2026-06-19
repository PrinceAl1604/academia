"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  type Community,
  type Space,
  type SpaceGroup,
  COMMUNITY_COLUMNS,
  SPACE_COLUMNS,
} from "./types";

/**
 * Client hook that loads the community sidebar nav (groups → spaces).
 *
 * The sidebar is a client component that re-mounts on navigation (each
 * page wraps its own SidebarLayout), so we keep a module-level cache:
 * the first load fetches, later mounts render instantly from cache while
 * revalidating in the background — no flash, no refetch-from-blank.
 *
 * The server equivalent (`getCommunityNav`) powers the space pages.
 */
let cache: { community: Community | null; groups: SpaceGroup[] } | null = null;

export function useCommunityNav() {
  const [community, setCommunity] = useState<Community | null>(cache?.community ?? null);
  const [groups, setGroups] = useState<SpaceGroup[]>(cache?.groups ?? []);
  const [loading, setLoading] = useState(!cache);

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
        cache = { community: null, groups: [] };
        if (active) setLoading(false);
        return;
      }

      const [{ data: groupRows }, { data: spaceRows }] = await Promise.all([
        supabase
          .from("space_groups")
          .select("id,community_id,name,emoji,sort_order")
          .eq("community_id", comm.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("spaces")
          .select(SPACE_COLUMNS)
          .eq("community_id", comm.id)
          .order("sort_order", { ascending: true }),
      ]);

      const spaces = (spaceRows ?? []) as Space[];
      const byGroup = new Map<string, Space[]>();
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

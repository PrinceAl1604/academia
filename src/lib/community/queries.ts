import { getSupabaseServer } from "@/lib/supabase-server";
import {
  type Community,
  type Space,
  type SpaceGroup,
  type SpaceNav,
  COMMUNITY_COLUMNS,
  SPACE_COLUMNS,
  SPACE_NAV_COLUMNS,
} from "./types";

/**
 * Server-side community queries.
 *
 * Nav reads go through the `space_nav` view (metadata only, lists every
 * space incl. `pro`) so locked spaces still appear. Full-content reads go
 * through the `spaces` table, which is RLS-gated by access tier — so a
 * non-Pro member literally cannot read a Pro space's `config`.
 */

export async function getActiveCommunity(): Promise<Community | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("communities")
    .select(COMMUNITY_COLUMNS)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as Community) ?? null;
}

export async function getCommunityNav(): Promise<{
  community: Community | null;
  groups: SpaceGroup[];
}> {
  const community = await getActiveCommunity();
  if (!community) return { community: null, groups: [] };

  const supabase = await getSupabaseServer();
  const [{ data: groupRows }, { data: navRows }] = await Promise.all([
    supabase
      .from("space_groups")
      .select("id,community_id,name,emoji,sort_order")
      .eq("community_id", community.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("space_nav")
      .select(SPACE_NAV_COLUMNS)
      .eq("community_id", community.id)
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

  const groups = ((groupRows ?? []) as Omit<SpaceGroup, "spaces">[]).map(
    (g) => ({ ...g, spaces: byGroup.get(g.id) ?? [] })
  );

  return { community, groups };
}

/** Metadata for one space (from the view) — works for any member, even on a
 *  Pro space they can't open (used to decide lock-wall vs content). */
export async function getSpaceNavBySlug(
  slug: string,
  communityId: string
): Promise<SpaceNav | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("space_nav")
    .select(SPACE_NAV_COLUMNS)
    .eq("community_id", communityId)
    .eq("slug", slug)
    .maybeSingle();
  return (data as SpaceNav) ?? null;
}

/** Full space row incl. `config` — RLS-gated; returns null if the caller
 *  isn't allowed to read it. */
export async function getSpaceBySlug(
  slug: string,
  communityId: string
): Promise<Space | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("spaces")
    .select(SPACE_COLUMNS)
    .eq("community_id", communityId)
    .eq("slug", slug)
    .maybeSingle();
  return (data as Space) ?? null;
}

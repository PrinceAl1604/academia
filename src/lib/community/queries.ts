import { getSupabaseServer } from "@/lib/supabase-server";
import {
  type Community,
  type Space,
  type SpaceGroup,
  COMMUNITY_COLUMNS,
  SPACE_COLUMNS,
} from "./types";

/**
 * Server-side community queries (RLS-aware — uses the user's session
 * client, so access tiers are enforced by Postgres, not by us).
 *
 * Single active community for now; `getActiveCommunity` just returns the
 * oldest row. When we go multi-tenant this resolves by host/slug instead.
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
  const [{ data: groupRows }, { data: spaceRows }] = await Promise.all([
    supabase
      .from("space_groups")
      .select("id,community_id,name,emoji,sort_order")
      .eq("community_id", community.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("spaces")
      .select(SPACE_COLUMNS)
      .eq("community_id", community.id)
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

  const groups = ((groupRows ?? []) as Omit<SpaceGroup, "spaces">[]).map(
    (g) => ({ ...g, spaces: byGroup.get(g.id) ?? [] })
  );

  return { community, groups };
}

export async function getSpaceBySlug(slug: string): Promise<Space | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("spaces")
    .select(SPACE_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  return (data as Space) ?? null;
}

import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * Members directory & profiles data layer (Phase 2).
 *
 * Reads go through the `member_directory` view (a definer view, like
 * `space_nav`) which exposes only non-sensitive columns and excludes
 * `private` profiles — so members can be listed without loosening RLS on
 * the `users` table or ever leaking emails. The owner of a `private`
 * profile (and admins) can still read it directly via RLS as a fallback.
 *
 * This module is server-only (it imports `supabase-server`). Client
 * components must `import type` the types below, never the functions.
 */

export type MemberSocials = {
  website?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
};

export type ProfileVisibility = "public" | "members" | "private";

export type DirectoryMember = {
  id: string;
  name: string;
  avatar_url: string | null;
  headline: string | null;
  location: string | null;
};

export type MemberProfile = DirectoryMember & {
  bio: string | null;
  socials: MemberSocials | null;
  created_at: string | null;
  last_active_at: string | null;
  profile_visibility: ProfileVisibility;
};

export const MEMBERS_PAGE_SIZE = 24;

const DIRECTORY_COLS = "id,name,avatar_url,headline,location";
const PROFILE_COLS =
  "id,name,avatar_url,headline,bio,location,socials,created_at,last_active_at,profile_visibility";

/** Strip characters that would break a PostgREST `.or()` filter string. */
function sanitizeSearch(term: string): string {
  return term.replace(/[%,()\\]/g, " ").trim();
}

/**
 * One page of the directory. Only the requested slice is fetched
 * (`.range()` + exact count) — never the whole table.
 */
export async function getMemberDirectory({
  q,
  page,
}: {
  q?: string;
  page: number;
}): Promise<{ members: DirectoryMember[]; total: number; pageSize: number }> {
  const supabase = await getSupabaseServer();
  const from = (page - 1) * MEMBERS_PAGE_SIZE;
  const to = from + MEMBERS_PAGE_SIZE - 1;

  let query = supabase
    .from("member_directory")
    .select(DIRECTORY_COLS, { count: "exact" });

  const safe = sanitizeSearch(q ?? "");
  if (safe) query = query.or(`name.ilike.%${safe}%,headline.ilike.%${safe}%`);

  query = query
    .order("last_active_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  const { data, count, error } = await query;
  if (error) return { members: [], total: 0, pageSize: MEMBERS_PAGE_SIZE };
  return {
    members: (data ?? []) as DirectoryMember[],
    total: count ?? 0,
    pageSize: MEMBERS_PAGE_SIZE,
  };
}

/**
 * A single profile. Public/members profiles come from the directory view;
 * a `private` profile resolves only for its owner or an admin (enforced by
 * RLS on `users`). Otherwise `blocked` is returned (treated as 404 so a
 * private profile's existence isn't revealed).
 */
export async function getMemberProfile(
  id: string,
  viewer: { viewerId: string | null; isAdmin: boolean }
): Promise<{ profile: MemberProfile | null; blocked: boolean }> {
  const supabase = await getSupabaseServer();

  const { data } = await supabase
    .from("member_directory")
    .select(PROFILE_COLS)
    .eq("id", id)
    .maybeSingle();
  if (data) return { profile: data as MemberProfile, blocked: false };

  // Not in the directory → private or nonexistent. The owner or an admin
  // may still read it (RLS allows own row / admin); everyone else is blocked.
  if (viewer.viewerId === id || viewer.isAdmin) {
    const { data: own } = await supabase
      .from("users")
      .select(PROFILE_COLS)
      .eq("id", id)
      .maybeSingle();
    if (own) return { profile: own as MemberProfile, blocked: false };
  }
  return { profile: null, blocked: true };
}

"use client";

import { supabase } from "@/lib/supabase";
import type {
  UserRepository,
  UserSummary,
  MentionableUser,
  UserProfile,
} from "@/lib/domain/ports/user-repository";

/**
 * Supabase implementation of UserRepository. Sole importer of the
 * supabase client for user-table reads/writes outside of the auth
 * lifecycle (which lives in lib/auth-context.tsx for now).
 */
export class SupabaseUserRepository implements UserRepository {
  async search(
    query: string,
    currentUserId: string,
    limit: number
  ): Promise<UserSummary[]> {
    // PostgREST filter injection guard. The `.or()` filter takes a
    // raw string of comma-separated conditions like
    //   "name.ilike.%foo%,email.ilike.%foo%"
    // and parses commas, parens, colons as syntax tokens. Without
    // sanitization, a user searching for `,role.eq.admin,` would
    // turn the OR list into 6 conditions including a literal
    // `role.eq.admin` — bypassing what the search is supposed to
    // match and surfacing admin users that wouldn't normally appear.
    //
    // Stripping the PostgREST-significant characters (comma, parens,
    // colon, asterisk, double-quote, backslash) before interpolation
    // closes the injection. Real-name search usage doesn't lose
    // anything meaningful — those chars don't appear in display
    // names or email-local-parts in practice.
    const trimmed = query.trim();
    const safe = trimmed.replace(/[(),:*\\"]/g, " ").trim();
    let req = supabase
      .from("users")
      .select("id, name, email, role, subscription_tier")
      .neq("id", currentUserId);
    if (safe) {
      req = req.or(`name.ilike.%${safe}%,email.ilike.%${safe}%`);
    }
    const { data } = await req.limit(limit);
    return (data ?? []) as UserSummary[];
  }

  async listMentionable(): Promise<MentionableUser[]> {
    const { data } = await supabase
      .from("users")
      .select("id, name, role")
      .order("name", { ascending: true });
    return (data ?? []) as MentionableUser[];
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data } = await supabase
      .from("users")
      .select(
        "id, email, name, role, subscription_tier, pro_expires_at, has_onboarded, referral_code"
      )
      .eq("id", userId)
      .single();
    return (data as UserProfile | null) ?? null;
  }

  async touchLastActive(userId: string): Promise<void> {
    await supabase
      .from("users")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", userId);
  }
}

export const userRepository: UserRepository = new SupabaseUserRepository();

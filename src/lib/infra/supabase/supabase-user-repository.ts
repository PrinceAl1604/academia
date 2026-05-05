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
    const trimmed = query.trim();
    let req = supabase
      .from("users")
      .select("id, name, email, role, subscription_tier")
      .neq("id", currentUserId);
    if (trimmed) {
      req = req.or(`name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`);
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

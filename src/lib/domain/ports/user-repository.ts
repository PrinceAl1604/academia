/**
 * UserRepository — interface for user/profile lookups. Inner
 * circle defines the contract; the Supabase adapter fulfills it.
 *
 * "User" here means application user (public.users), not the
 * auth.users row. The auth concern stays in lib/auth-context.tsx.
 */

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: string | null;
  subscription_tier: string;
}

export interface MentionableUser {
  id: string;
  name: string;
  avatar_url: string | null;
  role: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string | null;
  subscription_tier: string;
  pro_expires_at: string | null;
  has_onboarded: boolean | null;
  referral_code: string | null;
}

export interface UserRepository {
  /**
   * Search users by name or email substring. Empty query returns
   * the top suggestions. Excludes the current user. Caps at
   * `limit`.
   */
  search(query: string, currentUserId: string, limit: number): Promise<UserSummary[]>;

  /** Fetch the @-mention roster (id, name, role). */
  listMentionable(): Promise<MentionableUser[]>;

  /** Fetch full profile by id. */
  getProfile(userId: string): Promise<UserProfile | null>;

  /** Touch last_active_at — fire-and-forget on the caller side. */
  touchLastActive(userId: string): Promise<void>;
}

/**
 * Chat domain entities.
 *
 * Plain TypeScript types — no framework dependencies, no
 * Supabase types, no React. They describe what chat data IS in
 * the application's domain language. Database adapters map
 * Postgres rows → these entities at the edge of the system.
 */

export type ChannelType = "general" | "announcements" | "course" | "direct";

export interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  course_id: string | null;
  created_at: string;
}

export interface ChatMessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

export interface ChatMessageAuthor {
  id: string;
  name: string;
  avatar_url: string | null;
  role: string | null;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  user_id: string;
  parent_message_id: string | null;
  content: string;
  is_pinned: boolean;
  is_deleted: boolean;
  edited_at: string | null;
  created_at: string;
  user?: ChatMessageAuthor;
  reactions?: ChatMessageReaction[];
  /** Hoisted from the embed by repository adapters. */
  reply_count?: number;
}

export interface DmThread {
  channel_id: string;
  other_user_id: string;
  /**
   * Display name resolved by the repository — guaranteed non-empty.
   * The repo falls back through name → email-local-part → "User"
   * before returning, so consumers don't need their own `|| "?"`
   * fallback (which previously surfaced as a literal "?" avatar
   * for users whose `users.name` was never populated).
   */
  other_name: string;
  other_avatar_url: string | null;
  other_role: string | null;
  last_message_at: string | null;
}

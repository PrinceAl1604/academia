/**
 * ChatRepository — port (interface) defined by the inner circle.
 * The infrastructure layer (src/lib/infra/supabase/) implements
 * this; use cases and hooks depend on the interface, never on the
 * Supabase client directly.
 *
 * Subscription methods return an `unsubscribe` cleanup function
 * so callers can wire them straight into a useEffect return.
 */

import type {
  Channel,
  ChatMessage,
  ChatMessageReaction,
  DmThread,
} from "@/lib/domain/entities/chat";

export interface SendMessageInput {
  channelId: string;
  userId: string;
  content: string;
  parentMessageId?: string | null;
}

export interface UpdateMessageInput {
  messageId: string;
  content: string;
}

export interface ChannelSubscriptionHandlers {
  onInsert: (msg: ChatMessage) => void;
  onUpdate: (msg: ChatMessage) => void;
  onReactionInsert: (reaction: ChatMessageReaction) => void;
  onReactionDelete: (reaction: ChatMessageReaction) => void;
}

export interface ChatRepository {
  /** Fetch all channels visible to the current user. */
  listChannels(): Promise<Channel[]>;

  /** Fetch the current user's DM threads with peer info joined. */
  listDmThreads(currentUserId: string): Promise<DmThread[]>;

  /** Page newest messages for a channel. */
  listMessages(channelId: string, limit: number): Promise<ChatMessage[]>;

  /** Page older messages BEFORE a given timestamp. */
  listMessagesBefore(
    channelId: string,
    beforeIso: string,
    limit: number
  ): Promise<ChatMessage[]>;

  /** Fetch a single message with author + reactions populated. */
  getMessage(messageId: string): Promise<ChatMessage | null>;

  /** Fetch all non-deleted replies for a parent. */
  listReplies(parentMessageId: string): Promise<ChatMessage[]>;

  /** Insert a new message; returns the inserted row. */
  sendMessage(input: SendMessageInput): Promise<ChatMessage>;

  /** Soft-delete a message (sets is_deleted = true). */
  deleteMessage(messageId: string): Promise<void>;

  /** Edit a message body. */
  updateMessage(input: UpdateMessageInput): Promise<void>;

  /** Toggle pin state on a message. */
  setMessagePinned(messageId: string, pinned: boolean): Promise<void>;

  /** Add or remove a reaction. Idempotent. */
  setReaction(
    messageId: string,
    userId: string,
    emoji: string,
    on: boolean
  ): Promise<void>;

  /**
   * Mark a channel as read for a user. Implementation upserts
   * into chat_reads — opaque to callers.
   */
  markChannelRead(channelId: string, userId: string): Promise<void>;

  /**
   * Open or fetch a DM channel between current user and other.
   * Returns the channel id (existing or newly created).
   */
  getOrCreateDm(otherUserId: string): Promise<string>;

  /**
   * Subscribe to all channel-message + reaction events for a
   * single channel. Returns an unsubscribe function.
   */
  subscribeToChannel(
    channelId: string,
    handlers: ChannelSubscriptionHandlers
  ): () => void;

  /**
   * Subscribe to dm_participants inserts (i.e., new DM threads
   * appearing for the current user). Returns an unsubscribe fn.
   */
  subscribeToDmParticipants(
    userId: string,
    onInsert: () => void
  ): () => void;
}

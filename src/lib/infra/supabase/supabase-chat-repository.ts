"use client";

import { supabase } from "@/lib/supabase";
import type {
  ChatRepository,
  ChannelSubscriptionHandlers,
  SendMessageInput,
  UpdateMessageInput,
} from "@/lib/domain/ports/chat-repository";
import type {
  Channel,
  ChatMessage,
  ChatMessageReaction,
  DmThread,
} from "@/lib/domain/entities/chat";

/**
 * Supabase-backed implementation of ChatRepository. This is the
 * ONLY file in the chat slice that imports the supabase client —
 * everything inside (use cases, hooks, components) should depend
 * on the ChatRepository interface.
 */

const MESSAGE_SELECT =
  "*, user:users(id, name, role), reactions:chat_reactions(id, message_id, user_id, emoji), replies:chat_messages!parent_message_id(count)";

function normalizeReplyCount(msg: ChatMessage): ChatMessage {
  type EmbedShape = { replies?: { count: number }[] };
  const embed = msg as ChatMessage & EmbedShape;
  if (embed.replies && embed.replies.length > 0) {
    return { ...msg, reply_count: embed.replies[0].count };
  }
  return msg;
}

export class SupabaseChatRepository implements ChatRepository {
  async listChannels(): Promise<Channel[]> {
    const { data } = await supabase.from("chat_channels").select("*");
    return (data ?? []) as Channel[];
  }

  async listDmThreads(currentUserId: string): Promise<DmThread[]> {
    const { data } = await supabase
      .from("chat_dm_participants")
      .select("channel_id, user_id, user:users(id, name, role)")
      .neq("user_id", currentUserId);
    if (!data) return [];

    const channelIds = data.map((r) => r.channel_id);
    const lastByChannel = new Map<string, string>();
    if (channelIds.length > 0) {
      const { data: lasts } = await supabase
        .from("chat_messages")
        .select("channel_id, created_at")
        .in("channel_id", channelIds)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(channelIds.length * 5);
      if (lasts) {
        const seen = new Set<string>();
        for (const m of lasts) {
          if (!seen.has(m.channel_id)) {
            lastByChannel.set(m.channel_id, m.created_at);
            seen.add(m.channel_id);
          }
        }
      }
    }

    // Supabase's generated types model FK joins as arrays even when
    // the relationship is effectively 1:1. Cast each row through
    // unknown so we can read .user as a single object — at runtime
    // the nested embed is always one row per participant join.
    return (data ?? []).map((row) => {
      const r = row as unknown as {
        channel_id: string;
        user_id: string;
        user: { id: string; name: string; role: string | null };
      };
      return {
        channel_id: r.channel_id,
        other_user_id: r.user.id,
        other_name: r.user.name,
        other_role: r.user.role,
        last_message_at: lastByChannel.get(r.channel_id) ?? null,
      };
    });
  }

  async listMessages(channelId: string, limit: number): Promise<ChatMessage[]> {
    const { data } = await supabase
      .from("chat_messages")
      .select(MESSAGE_SELECT)
      .eq("channel_id", channelId)
      .is("parent_message_id", null)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(limit);
    const rows = ((data ?? []) as ChatMessage[]).map(normalizeReplyCount);
    return rows.reverse();
  }

  async listMessagesBefore(
    channelId: string,
    beforeIso: string,
    limit: number
  ): Promise<ChatMessage[]> {
    const { data } = await supabase
      .from("chat_messages")
      .select(MESSAGE_SELECT)
      .eq("channel_id", channelId)
      .is("parent_message_id", null)
      .eq("is_deleted", false)
      .lt("created_at", beforeIso)
      .order("created_at", { ascending: false })
      .limit(limit);
    const rows = ((data ?? []) as ChatMessage[]).map(normalizeReplyCount);
    return rows.reverse();
  }

  async getMessage(messageId: string): Promise<ChatMessage | null> {
    const { data } = await supabase
      .from("chat_messages")
      .select(MESSAGE_SELECT)
      .eq("id", messageId)
      .single();
    return data ? normalizeReplyCount(data as ChatMessage) : null;
  }

  async listReplies(parentMessageId: string): Promise<ChatMessage[]> {
    const { data } = await supabase
      .from("chat_messages")
      .select(MESSAGE_SELECT)
      .eq("parent_message_id", parentMessageId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });
    return ((data ?? []) as ChatMessage[]).map(normalizeReplyCount);
  }

  async sendMessage(input: SendMessageInput): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        channel_id: input.channelId,
        user_id: input.userId,
        content: input.content,
        parent_message_id: input.parentMessageId ?? null,
      })
      .select(MESSAGE_SELECT)
      .single();
    if (error || !data) throw error || new Error("send failed");
    return normalizeReplyCount(data as ChatMessage);
  }

  async deleteMessage(messageId: string): Promise<void> {
    await supabase
      .from("chat_messages")
      .update({ is_deleted: true })
      .eq("id", messageId);
  }

  async updateMessage(input: UpdateMessageInput): Promise<void> {
    await supabase
      .from("chat_messages")
      .update({ content: input.content, edited_at: new Date().toISOString() })
      .eq("id", input.messageId);
  }

  async setMessagePinned(messageId: string, pinned: boolean): Promise<void> {
    await supabase
      .from("chat_messages")
      .update({ is_pinned: pinned })
      .eq("id", messageId);
  }

  async setReaction(
    messageId: string,
    userId: string,
    emoji: string,
    on: boolean
  ): Promise<void> {
    if (on) {
      await supabase
        .from("chat_reactions")
        .insert({ message_id: messageId, user_id: userId, emoji });
    } else {
      await supabase
        .from("chat_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", userId)
        .eq("emoji", emoji);
    }
  }

  async markChannelRead(channelId: string, userId: string): Promise<void> {
    await supabase
      .from("chat_reads")
      .upsert(
        {
          user_id: userId,
          channel_id: channelId,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "user_id,channel_id" }
      );
  }

  async getOrCreateDm(otherUserId: string): Promise<string> {
    const { data, error } = await supabase.rpc("get_or_create_dm", {
      other_user_id: otherUserId,
    });
    if (error || !data) throw error || new Error("get_or_create_dm failed");
    return data as string;
  }

  subscribeToChannel(
    channelId: string,
    handlers: ChannelSubscriptionHandlers
  ): () => void {
    const channel = supabase
      .channel(`messages_${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const inserted = payload.new as ChatMessage;
          const full = await this.getMessage(inserted.id);
          if (full) handlers.onInsert(full);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const updated = payload.new as ChatMessage;
          const full = await this.getMessage(updated.id);
          if (full) handlers.onUpdate(full);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_reactions" },
        (payload) => {
          handlers.onReactionInsert(payload.new as ChatMessageReaction);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_reactions" },
        (payload) => {
          handlers.onReactionDelete(payload.old as ChatMessageReaction);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  subscribeToDmParticipants(userId: string, onInsert: () => void): () => void {
    const channel = supabase
      .channel(`dm_participants_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_dm_participants",
          filter: `user_id=eq.${userId}`,
        },
        () => onInsert()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

/** Singleton — composition root for the chat slice. */
export const chatRepository: ChatRepository = new SupabaseChatRepository();

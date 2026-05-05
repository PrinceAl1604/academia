/**
 * SendChatMessage — application Use Case for posting a chat
 * message into a channel (or as a thread reply).
 *
 * Why a class instead of a free function:
 *   - Constructor takes the ChatRepository port, so the use case
 *     is independent of Supabase. A test can pass an in-memory
 *     repo and assert on `execute()` calls without a DB.
 *   - The class shape signals "this is a unit of business
 *     behavior" — distinguishable from the generic helpers in
 *     lib/utils.
 *
 * Application rules enforced here (not at the repository):
 *   - Empty / whitespace-only content is rejected.
 *   - Content is trimmed before persisting.
 *   - Server-side authz (RLS) does the actual gatekeeping for
 *     who can post in which channel — this use case trusts that.
 */

import type {
  ChatRepository,
  SendMessageInput,
} from "@/lib/domain/ports/chat-repository";
import type { ChatMessage } from "@/lib/domain/entities/chat";

export interface SendChatMessageRequest {
  channelId: string;
  userId: string;
  content: string;
  parentMessageId?: string | null;
}

export class SendChatMessage {
  constructor(private readonly chat: ChatRepository) {}

  async execute(req: SendChatMessageRequest): Promise<ChatMessage> {
    const trimmed = req.content.trim();
    if (!trimmed) {
      throw new Error("Cannot send an empty message.");
    }
    const input: SendMessageInput = {
      channelId: req.channelId,
      userId: req.userId,
      content: trimmed,
      parentMessageId: req.parentMessageId ?? null,
    };
    return this.chat.sendMessage(input);
  }
}

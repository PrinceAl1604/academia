/**
 * MarkChannelRead — clears unread state for a (channel, user)
 * tuple by upserting the latest read marker. Idempotent.
 *
 * Application rule: never mark read when the user id is missing
 * (e.g., on signed-out callers). Silent no-op rather than
 * throwing — call sites typically fire this on focus/scroll
 * events and shouldn't have to gate it themselves.
 */

import type { ChatRepository } from "@/lib/domain/ports/chat-repository";

export class MarkChannelRead {
  constructor(private readonly chat: ChatRepository) {}

  async execute(channelId: string, userId: string | undefined): Promise<void> {
    if (!userId || !channelId) return;
    await this.chat.markChannelRead(channelId, userId);
  }
}

/**
 * ToggleMessageReaction — adds the (user, emoji) reaction if the
 * user hasn't reacted with that emoji yet, removes it otherwise.
 *
 * The "is this user already reacted?" decision lives at the call
 * site (the message row knows from its own state) — passing
 * `currentlyReacted` keeps this use case stateless and avoids a
 * round-trip to the repository to re-fetch reactions.
 */

import type { ChatRepository } from "@/lib/domain/ports/chat-repository";

export interface ToggleReactionRequest {
  messageId: string;
  userId: string;
  emoji: string;
  currentlyReacted: boolean;
}

export class ToggleMessageReaction {
  constructor(private readonly chat: ChatRepository) {}

  async execute(req: ToggleReactionRequest): Promise<void> {
    if (!req.userId || !req.messageId || !req.emoji) return;
    await this.chat.setReaction(
      req.messageId,
      req.userId,
      req.emoji,
      !req.currentlyReacted
    );
  }
}

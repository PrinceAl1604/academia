/**
 * StartDm — open or create a direct-message channel between the
 * current user and another user.
 *
 * Returns the channel id on success. The caller is responsible
 * for switching the active channel + refetching the channel list
 * (those are UI concerns, not domain concerns).
 *
 * Server-side authz (the `get_or_create_dm` RPC) gates whether
 * the current user is allowed to initiate (Pro/admin in our
 * model). The use case surfaces failures as a typed error so the
 * UI can display a localized message.
 */

import type { ChatRepository } from "@/lib/domain/ports/chat-repository";

export class StartDmError extends Error {
  constructor(message = "Couldn't open conversation") {
    super(message);
    this.name = "StartDmError";
  }
}

export class StartDm {
  constructor(private readonly chat: ChatRepository) {}

  async execute(otherUserId: string): Promise<string> {
    if (!otherUserId) {
      throw new StartDmError("Missing peer user id");
    }
    try {
      return await this.chat.getOrCreateDm(otherUserId);
    } catch (err) {
      throw new StartDmError(
        err instanceof Error ? err.message : "Couldn't open conversation"
      );
    }
  }
}

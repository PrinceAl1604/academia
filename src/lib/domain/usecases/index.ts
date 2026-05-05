/**
 * Use case composition root.
 *
 * In Clean Architecture, the "Main" component is a plugin to the
 * inner circles: it picks concrete implementations and wires
 * them into the use cases that the rest of the app consumes.
 *
 * For a Next.js client-side app this `index.ts` plays the same
 * role — it's the single place that knows which repository
 * implementation backs which use case. Pages, hooks, and
 * components import the *named instance* (e.g. `sendChatMessage`)
 * and get a working object with the dependency already injected.
 *
 * Swapping Supabase for a different backend means editing only
 * the imports below; nothing in app/ or components/ has to
 * change.
 */

import { chatRepository } from "@/lib/infra/supabase/supabase-chat-repository";
import { courseRepository } from "@/lib/infra/supabase/supabase-course-repository";

import { SendChatMessage } from "./send-chat-message";
import { StartDm } from "./start-dm";
import { MarkChannelRead } from "./mark-channel-read";
import { ToggleMessageReaction } from "./toggle-message-reaction";
import { EnrollInCourse } from "./enroll-in-course";
import { MarkLessonComplete } from "./mark-lesson-complete";

export const sendChatMessage = new SendChatMessage(chatRepository);
export const startDm = new StartDm(chatRepository);
export const markChannelRead = new MarkChannelRead(chatRepository);
export const toggleMessageReaction = new ToggleMessageReaction(chatRepository);
export const enrollInCourse = new EnrollInCourse(courseRepository);
export const markLessonComplete = new MarkLessonComplete(courseRepository);

export { StartDmError } from "./start-dm";

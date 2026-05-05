/**
 * Deterministic avatar tint per user id.
 *
 * A monochrome wall of "first letter on grey" mutes identity in
 * chat. Hashing the id into one of N tinted backgrounds gives
 * instant visual recognition without uploading photos. Admins
 * still override with the red authority tint at call sites.
 *
 * The hash is intentionally cheap (Math.random() would be wrong —
 * we need stability across renders and across clients so the same
 * user always gets the same color in everyone's view).
 */

const AVATAR_TINTS = [
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
];

export function userTintClass(id?: string | null): string {
  if (!id) return AVATAR_TINTS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length];
}

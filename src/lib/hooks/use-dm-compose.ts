"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Owns the inline DM compose flow. Replaces the old modal dialog
 * with a single hook that the page mounts in its own slot. The
 * hook tracks compose mode, the search query, the result list,
 * and the start-conversation action.
 *
 * Empty query returns the top 12 suggested users so the panel is
 * useful the moment it opens (admins → Pro → alphabetical). The
 * search useEffect is gated on composeMode so we don't burn DB
 * queries when the panel isn't visible.
 *
 * Side-effecting transitions (channel list refetch + active
 * channel switch) are exposed as callbacks the page passes in.
 * Keeps the hook ignorant of how the page tracks channels — the
 * hook's only job is "produce a channel id, hand it off."
 */
export interface DmComposeUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
  subscription_tier: string;
}

interface DmComposeOptions {
  userId: string | undefined;
  /** Called with the channel id of the freshly opened DM. */
  onConversationOpened: (channelId: string) => void;
  /** Optional translation strings. Defaults to English fallbacks. */
  translations?: {
    cannotMessage?: string;
  };
}

interface DmComposeApi {
  composeMode: boolean;
  query: string;
  setQuery: (q: string) => void;
  results: DmComposeUser[];
  starting: boolean;
  error: string | null;
  open: () => void;
  close: () => void;
  startWith: (otherUserId: string) => Promise<void>;
}

export function useDmCompose(options: DmComposeOptions): DmComposeApi {
  const { userId, onConversationOpened, translations } = options;
  const [composeMode, setComposeMode] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DmComposeUser[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      if (!userId) {
        setResults([]);
        return;
      }
      const trimmed = q.trim();
      let req = supabase
        .from("users")
        .select("id, name, email, role, subscription_tier")
        .neq("id", userId);
      if (trimmed) {
        req = req.or(`name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`);
      }
      const { data } = await req.limit(12);
      const sorted = (data ?? []).sort(
        (
          a: { role: string | null; subscription_tier: string; name: string },
          b: { role: string | null; subscription_tier: string; name: string }
        ) => {
          if (a.role === "admin" && b.role !== "admin") return -1;
          if (b.role === "admin" && a.role !== "admin") return 1;
          if (a.subscription_tier === "pro" && b.subscription_tier !== "pro") return -1;
          if (b.subscription_tier === "pro" && a.subscription_tier !== "pro") return 1;
          return a.name.localeCompare(b.name);
        }
      );
      setResults(sorted);
    },
    [userId]
  );

  // Debounced search trigger — only runs while compose is open so
  // we don't burn a query on every keystroke when the panel isn't
  // visible.
  useEffect(() => {
    if (!composeMode) return;
    const timer = setTimeout(() => runSearch(query), 200);
    return () => clearTimeout(timer);
  }, [composeMode, query, runSearch]);

  const startWith = useCallback(
    async (otherUserId: string) => {
      setStarting(true);
      setError(null);
      const { data, error: rpcError } = await supabase.rpc("get_or_create_dm", {
        other_user_id: otherUserId,
      });
      if (rpcError || !data) {
        setError(translations?.cannotMessage || "Couldn't open conversation");
        setStarting(false);
        return;
      }
      onConversationOpened(data as string);
      setComposeMode(false);
      setQuery("");
      setResults([]);
      setStarting(false);
    },
    [onConversationOpened, translations?.cannotMessage]
  );

  const open = useCallback(() => {
    setComposeMode(true);
    setQuery("");
    setResults([]);
    setError(null);
  }, []);

  const close = useCallback(() => {
    setComposeMode(false);
    setQuery("");
    setResults([]);
    setError(null);
  }, []);

  return {
    composeMode,
    query,
    setQuery,
    results,
    starting,
    error,
    open,
    close,
    startWith,
  };
}

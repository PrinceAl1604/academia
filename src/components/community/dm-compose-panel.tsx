"use client";

import { Search as SearchIcon, X, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { userTintClass } from "@/lib/avatar-color";
import type { useDmCompose } from "@/lib/hooks/use-dm-compose";

/**
 * Inline DM compose panel — takes over the chat area instead of
 * opening a modal. Receives the full useDmCompose() return value
 * so it stays a dumb-ish view: open/close/start are all callbacks
 * the hook owns, the panel just renders state and forwards
 * intent.
 *
 * Why a single `compose` prop instead of destructured props:
 *   - Six related fields move together; passing them as one
 *     object keeps the call site readable and lets us evolve the
 *     hook's API without touching every consumer.
 *   - Type comes from `ReturnType<typeof useDmCompose>` so the
 *     contract follows the hook automatically.
 */
type DmComposeApi = ReturnType<typeof useDmCompose>;

interface DmComposePanelProps {
  compose: DmComposeApi;
  isEn: boolean;
  /**
   * Subset of community-namespace translation strings the panel
   * needs. We pass them in (rather than reading from context
   * here) so the component is trivially testable and locale-
   * agnostic at the type level.
   */
  labels: {
    title?: string;
    searchPlaceholder?: string;
    emptyResults?: string;
    adminBadge?: string;
  };
}

export function DmComposePanel({ compose, isEn, labels }: DmComposePanelProps) {
  return (
    <>
      {/* Header: close button + title */}
      <div className="border-b border-border">
        <div className="max-w-3xl mx-auto w-full flex items-center gap-2 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground/70"
            onClick={compose.close}
            aria-label={isEn ? "Close" : "Fermer"}
          >
            <X className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            {labels.title ||
              (isEn ? "New direct message" : "Nouveau message")}
          </h1>
        </div>
      </div>

      {/* Search input row */}
      <div className="border-b border-border">
        <div className="max-w-3xl mx-auto w-full px-4 py-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              value={compose.query}
              onChange={(e) => compose.setQuery(e.target.value)}
              placeholder={
                labels.searchPlaceholder ||
                (isEn ? "Search people…" : "Rechercher quelqu'un…")
              }
              className="pl-9"
              autoFocus
            />
          </div>
        </div>
      </div>

      {/* Result list */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-4 py-3">
          {compose.results.length === 0 ? (
            <p className="text-xs text-muted-foreground/70 text-center py-12">
              {compose.query.trim()
                ? labels.emptyResults ||
                  (isEn
                    ? "No matching members."
                    : "Aucun membre correspondant.")
                : isEn
                ? "No members yet."
                : "Aucun membre pour l'instant."}
            </p>
          ) : (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50 px-2 pb-2">
                <span className="opacity-50">/</span>{" "}
                {compose.query.trim()
                  ? isEn
                    ? "Results"
                    : "Résultats"
                  : isEn
                  ? "Suggested"
                  : "Suggestions"}
              </p>
              <div className="space-y-0.5">
                {compose.results.map((u) => {
                  const isAdminUser = u.role === "admin";
                  const isProUser = u.subscription_tier === "pro";
                  const initials = (u.name || u.email || "?")
                    .split(/[\s@]+/)
                    .map((s) => s[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => compose.startWith(u.id)}
                      disabled={compose.starting}
                      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted/40 transition-colors disabled:opacity-50"
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback
                          className={cn(
                            "text-xs font-medium",
                            isAdminUser
                              ? "bg-amber-500/15 text-amber-500"
                              : userTintClass(u.id)
                          )}
                        >
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-foreground truncate">
                            {u.name || u.email.split("@")[0]}
                          </p>
                          {isAdminUser && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-amber-500">
                              <Crown className="h-2.5 w-2.5" />
                              {labels.adminBadge || "Host"}
                            </span>
                          )}
                          {!isAdminUser && isProUser && (
                            <Badge className="bg-primary/15 text-primary text-[9px] px-1.5 py-0">
                              Pro
                            </Badge>
                          )}
                        </div>
                        <p className="font-mono text-[10px] text-muted-foreground/70 truncate">
                          {u.email}
                        </p>
                      </div>
                      {compose.starting && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/70 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {compose.error && (
            <p className="text-xs text-destructive px-2 pt-3">
              {compose.error}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

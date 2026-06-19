"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, MapPin, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/i18n/language-context";
import type { DirectoryMember } from "@/lib/community/members";

function initials(name: string): string {
  return (name || "?")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MembersDirectoryView({
  members,
  total,
  page,
  pageSize,
  q,
}: {
  members: DirectoryMember[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
}) {
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";
  const router = useRouter();
  const [value, setValue] = useState(q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const hrefFor = (nextQ: string, nextPage: number) => {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return `/members${qs ? `?${qs}` : ""}`;
  };

  const onChange = (next: string) => {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => router.replace(hrefFor(next, 1)), 300);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {isEn ? "Members" : "Membres"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isEn
            ? "Discover the people in the community."
            : "Découvrez les membres de la communauté."}
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isEn ? "Search by name…" : "Rechercher par nom…"}
          className="pl-9"
        />
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-16 text-center">
          <Users className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-foreground">
            {isEn ? "No members found" : "Aucun membre trouvé"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {q
              ? isEn
                ? "Try a different search."
                : "Essayez une autre recherche."
              : isEn
                ? "The directory is empty for now."
                : "L'annuaire est vide pour l'instant."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <Link
                key={m.id}
                href={`/members/${m.id}`}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-4 transition-colors hover:border-border hover:bg-accent/40"
              >
                <Avatar size="lg">
                  {m.avatar_url && <AvatarImage src={m.avatar_url} alt={m.name} />}
                  <AvatarFallback>{initials(m.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{m.name}</p>
                  {m.headline && (
                    <p className="truncate text-sm text-muted-foreground">
                      {m.headline}
                    </p>
                  )}
                  {m.location && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground/70">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {m.location}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => router.push(hrefFor(q, page - 1))}
              >
                {isEn ? "Previous" : "Précédent"}
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                {isEn
                  ? `Page ${page} of ${totalPages}`
                  : `Page ${page} sur ${totalPages}`}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => router.push(hrefFor(q, page + 1))}
              >
                {isEn ? "Next" : "Suivant"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

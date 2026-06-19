"use client";

import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Globe,
  Twitter,
  Linkedin,
  Instagram,
  Pencil,
  Lock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/i18n/language-context";
import type { MemberProfile, MemberSocials } from "@/lib/community/members";

function initials(name: string): string {
  return (name || "?")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Prefix a bare domain with https:// so the link is followable. */
function normalizeUrl(v: string): string {
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

const SOCIAL_FIELDS: { key: keyof MemberSocials; label: string; icon: LucideIcon }[] = [
  { key: "website", label: "Website", icon: Globe },
  { key: "twitter", label: "Twitter / X", icon: Twitter },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "instagram", label: "Instagram", icon: Instagram },
];

export function MemberProfileView({
  profile,
  isSelf,
}: {
  profile: MemberProfile;
  isSelf: boolean;
}) {
  const { t, language } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";
  const socials: MemberSocials = profile.socials ?? {};
  const socialLinks = SOCIAL_FIELDS.filter((f) => socials[f.key]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/members"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {isEn ? "Back to members" : "Retour aux membres"}
      </Link>

      <div className="rounded-xl border border-border/60 bg-card p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start">
          <Avatar className="size-20 shrink-0">
            {profile.avatar_url && (
              <AvatarImage src={profile.avatar_url} alt={profile.name} />
            )}
            <AvatarFallback className="text-xl">
              {initials(profile.name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{profile.name}</h1>
              {profile.profile_visibility === "private" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  {isEn ? "Private" : "Privé"}
                </span>
              )}
            </div>
            {profile.headline && (
              <p className="mt-0.5 text-muted-foreground">{profile.headline}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/70">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {profile.location}
                </span>
              )}
              {profile.created_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {(isEn ? "Member since " : "Membre depuis ") +
                    new Date(profile.created_at).toLocaleDateString(
                      language === "en" ? "en-US" : "fr-FR",
                      { month: "short", year: "numeric" }
                    )}
                </span>
              )}
            </div>
          </div>

          {isSelf && (
            <Link
              href="/dashboard/settings"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
              {isEn ? "Edit profile" : "Modifier le profil"}
            </Link>
          )}
        </div>

        {profile.bio && (
          <>
            <div className="my-5 h-px bg-border/60" />
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {profile.bio}
            </p>
          </>
        )}

        {socialLinks.length > 0 && (
          <>
            <div className="my-5 h-px bg-border/60" />
            <div className="flex flex-wrap gap-2">
              {socialLinks.map((f) => {
                const Icon = f.icon;
                return (
                  <a
                    key={f.key}
                    href={normalizeUrl(socials[f.key]!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {f.label}
                  </a>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

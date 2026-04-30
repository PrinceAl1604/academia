"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Illustration } from "@/components/shared/illustration";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Clock,
  CheckCircle,
  Key,
  Search,
  Gift,
  Loader2,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

interface ReferralUser {
  name: string | null;
  email: string;
}

interface Referral {
  id: string;
  status: string;
  reward_days: number;
  created_at: string;
  rewarded_at: string | null;
  licence_key_sent?: string | null;
  referrer: ReferralUser;
  referred: ReferralUser;
}

export default function AdminReferralsPage() {
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/referrals");
        if (res.ok) {
          const json = await res.json();
          setReferrals(json.referrals ?? []);
        }
      } catch {
        // silently fail — empty state will show
      }
      setLoading(false);
    }
    load();
  }, []);

  // Stats
  const totalReferrals = referrals.length;
  const pendingCount = referrals.filter((r) => r.status === "pending").length;
  const rewardedCount = referrals.filter((r) => r.status === "rewarded").length;
  const keysSentCount = referrals.filter((r) => r.licence_key_sent).length;

  // Search filtering
  const filtered = useMemo(() => {
    if (!search) return referrals;
    const q = search.toLowerCase();
    return referrals.filter(
      (r) =>
        (r.referrer?.name || "").toLowerCase().includes(q) ||
        (r.referrer?.email || "").toLowerCase().includes(q) ||
        (r.referred?.name || "").toLowerCase().includes(q) ||
        (r.referred?.email || "").toLowerCase().includes(q)
    );
  }, [referrals, search]);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(isEn ? "en-US" : "fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email ? email[0].toUpperCase() : "?";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {(t.admin as Record<string, string>).referrals || "Referrals"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isEn
            ? "Track referral activity and rewards"
            : "Suivre l'activite des parrainages et recompenses"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="dark:bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {totalReferrals}
              </p>
              <p className="text-xs text-muted-foreground">
                {isEn ? "Total Referrals" : "Total parrainages"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {pendingCount}
              </p>
              <p className="text-xs text-muted-foreground">
                {isEn ? "Pending" : "En attente"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {rewardedCount}
              </p>
              <p className="text-xs text-muted-foreground">
                {isEn ? "Rewarded" : "Recompenses"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Key className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {keysSentCount}
              </p>
              <p className="text-xs text-muted-foreground">
                {isEn ? "Keys Sent" : "Cles envoyees"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
        <Input
          placeholder={
            isEn
              ? "Filter by name or email..."
              : "Filtrer par nom ou email..."
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Referrals Table */}
      {referrals.length === 0 ? (
        <div className="py-16 text-center flex flex-col items-center">
          <Illustration name="admin-empty" alt="" size="md" />
          <p className="mt-4 text-muted-foreground max-w-md">
            {isEn
              ? "No referrals yet. Referrals will appear here when students share their codes."
              : "Aucun parrainage pour le moment. Les parrainages apparaitront ici quand les etudiants partageront leurs codes."}
          </p>
        </div>
      ) : (
        <Card className="dark:bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {isEn ? "Referrer" : "Parrain"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {isEn ? "Referred Friend" : "Ami parraine"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {isEn ? "Status" : "Statut"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                    {isEn ? "Date" : "Date"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                    {isEn ? "Rewarded Date" : "Date recompense"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                    {isEn ? "Licence Key" : "Cle de licence"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((referral) => (
                  <tr
                    key={referral.id}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    {/* Referrer */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-muted text-xs font-medium dark:text-muted-foreground/70">
                            {getInitials(
                              referral.referrer?.name,
                              referral.referrer?.email || ""
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {referral.referrer?.name ||
                              referral.referrer?.email?.split("@")[0] ||
                              "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {referral.referrer?.email || ""}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Referred Friend */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-muted text-xs font-medium dark:text-muted-foreground/70">
                            {getInitials(
                              referral.referred?.name,
                              referral.referred?.email || ""
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {referral.referred?.name ||
                              referral.referred?.email?.split("@")[0] ||
                              "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {referral.referred?.email || ""}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {referral.status === "rewarded" ? (
                        <Badge className="bg-primary/15 text-green-700 dark:bg-green-900/30">
                          {isEn ? "Rewarded" : "Recompense"}
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700">
                          {isEn ? "Pending" : "En attente"}
                        </Badge>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(referral.created_at)}
                      </span>
                    </td>

                    {/* Rewarded Date */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {referral.rewarded_at
                          ? formatDate(referral.rewarded_at)
                          : "\u2014"}
                      </span>
                    </td>

                    {/* Licence Key */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {referral.licence_key_sent ? (
                        <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-foreground/90">
                          {referral.licence_key_sent}
                        </code>
                      ) : (
                        <span className="text-sm text-muted-foreground/70">{"\u2014"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {filtered.length}{" "}
              {isEn ? "referrals" : "parrainages"}
              {search && ` (${isEn ? "filtered" : "filtres"})`}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

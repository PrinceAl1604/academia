"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          {(t.admin as Record<string, string>).referrals || "Referrals"}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {isEn
            ? "Track referral activity and rewards"
            : "Suivre l'activite des parrainages et recompenses"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="dark:bg-neutral-900 dark:border-neutral-800">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {totalReferrals}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isEn ? "Total Referrals" : "Total parrainages"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-neutral-900 dark:border-neutral-800">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {pendingCount}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isEn ? "Pending" : "En attente"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-neutral-900 dark:border-neutral-800">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {rewardedCount}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isEn ? "Rewarded" : "Recompenses"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-neutral-900 dark:border-neutral-800">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Key className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {keysSentCount}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isEn ? "Keys Sent" : "Cles envoyees"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          placeholder={
            isEn
              ? "Filter by name or email..."
              : "Filtrer par nom ou email..."
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 dark:bg-neutral-900 dark:border-neutral-700"
        />
      </div>

      {/* Referrals Table */}
      {referrals.length === 0 ? (
        <div className="py-20 text-center">
          <Gift className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-600" />
          <p className="mt-3 text-neutral-500 dark:text-neutral-400">
            {isEn
              ? "No referrals yet. Referrals will appear here when students share their codes."
              : "Aucun parrainage pour le moment. Les parrainages apparaitront ici quand les etudiants partageront leurs codes."}
          </p>
        </div>
      ) : (
        <Card className="dark:bg-neutral-900 dark:border-neutral-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-neutral-800">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    {isEn ? "Referrer" : "Parrain"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    {isEn ? "Referred Friend" : "Ami parraine"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    {isEn ? "Status" : "Statut"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 hidden md:table-cell">
                    {isEn ? "Date" : "Date"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 hidden lg:table-cell">
                    {isEn ? "Rewarded Date" : "Date recompense"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 hidden lg:table-cell">
                    {isEn ? "Licence Key" : "Cle de licence"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-neutral-800">
                {filtered.map((referral) => (
                  <tr
                    key={referral.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    {/* Referrer */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-neutral-200 dark:bg-neutral-700 text-xs font-medium dark:text-neutral-300">
                            {getInitials(
                              referral.referrer?.name,
                              referral.referrer?.email || ""
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                            {referral.referrer?.name ||
                              referral.referrer?.email?.split("@")[0] ||
                              "Unknown"}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                            {referral.referrer?.email || ""}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Referred Friend */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-neutral-200 dark:bg-neutral-700 text-xs font-medium dark:text-neutral-300">
                            {getInitials(
                              referral.referred?.name,
                              referral.referred?.email || ""
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                            {referral.referred?.name ||
                              referral.referred?.email?.split("@")[0] ||
                              "Unknown"}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                            {referral.referred?.email || ""}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {referral.status === "rewarded" ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {isEn ? "Rewarded" : "Recompense"}
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          {isEn ? "Pending" : "En attente"}
                        </Badge>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        {formatDate(referral.created_at)}
                      </span>
                    </td>

                    {/* Rewarded Date */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        {referral.rewarded_at
                          ? formatDate(referral.rewarded_at)
                          : "\u2014"}
                      </span>
                    </td>

                    {/* Licence Key */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {referral.licence_key_sent ? (
                        <code className="rounded bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-mono text-neutral-700 dark:text-neutral-300">
                          {referral.licence_key_sent}
                        </code>
                      ) : (
                        <span className="text-sm text-neutral-400">{"\u2014"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t dark:border-neutral-800 px-4 py-3">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
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

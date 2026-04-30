"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";
import { supabase } from "@/lib/supabase";
import { syncAllCourseTotals } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Loader2, Gift } from "lucide-react";
import { Illustration } from "@/components/shared/illustration";

interface ReferralUser {
  name: string | null;
  email: string;
}

interface Referral {
  id: string;
  status: string;
  created_at: string;
  referrer: ReferralUser;
  referred: ReferralUser;
}

interface Stats {
  totalStudents: number;
  proStudents: number;
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  recentSignups: number;
}

/**
 * Admin dashboard — ElevenLabs-inspired layout.
 *
 * Three sections:
 *   1. Hero — mono "/ Admin" preheader + tight headline (matches the
 *      app's section-page pattern from Phase 4)
 *   2. Six illustrated entry cards in a horizontal grid — every primary
 *      admin action gets its own visual anchor. Replaces the old
 *      mix of small stat cards (visually identical) + 3 "quick action"
 *      cards (different size + treatment) which made the page feel
 *      like two stitched-together patterns.
 *   3. Lower split — recent activity (2/3 width) + stats sidebar
 *      (1/3 width). Stats are de-prioritized to glanceable status
 *      readouts because the cards above carry the visual weight.
 */
export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const isEn = t.nav.signIn === "Sign In";

  useEffect(() => {
    async function loadStats() {
      const [
        { count: totalStudents },
        { count: proStudents },
        { count: totalCourses },
        { count: publishedCourses },
        { count: totalEnrollments },
        { count: recentSignups },
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("subscription_tier", "pro"),
        supabase.from("courses").select("*", { count: "exact", head: true }),
        supabase.from("courses").select("*", { count: "exact", head: true }).eq("is_published", true),
        supabase.from("enrollments").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      setStats({
        totalStudents: totalStudents ?? 0,
        proStudents: proStudents ?? 0,
        totalCourses: totalCourses ?? 0,
        publishedCourses: publishedCourses ?? 0,
        totalEnrollments: totalEnrollments ?? 0,
        recentSignups: recentSignups ?? 0,
      });

      try {
        const res = await fetch("/api/admin/referrals");
        if (res.ok) {
          const json = await res.json();
          setReferrals(json.referrals ?? []);
        }
      } catch {}

      setLoading(false);
      syncAllCourseTotals();
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  // Six entry cards — primary admin actions. Order is deliberate: most-
  // used actions first (Add Course, Manage Courses), then resource
  // management (Students, Licences), then community/insights (Referrals,
  // Analytics).
  const entryCards = [
    {
      label: t.admin.addCourse,
      href: "/admin/courses/new",
      illustration: "add-course",
    },
    {
      label: t.admin.manageCourses,
      href: "/admin/courses",
      illustration: "courses-manage",
    },
    {
      label: t.sidebar.students || "Students",
      href: "/admin/students",
      illustration: "students",
    },
    {
      label: t.admin.licences,
      href: "/admin/licences",
      illustration: "licences",
    },
    {
      label: t.admin.referrals,
      href: "/admin/referrals",
      illustration: "referral",
    },
    {
      label: t.admin.analytics,
      href: "/admin/analytics",
      illustration: "analytics",
    },
  ];

  // At-a-glance stats — sidebar treatment, not heroic. Uses mono-tabular
  // figures aligned right-edge so the eye can scan the column quickly.
  const statRows = [
    { label: t.admin.totalStudents, value: stats?.totalStudents ?? 0 },
    { label: t.admin.proSubscribers, value: stats?.proStudents ?? 0 },
    {
      label: t.admin.totalCourses,
      value: `${stats?.publishedCourses ?? 0} / ${stats?.totalCourses ?? 0}`,
    },
    { label: t.admin.newSignups30d, value: stats?.recentSignups ?? 0 },
  ];

  return (
    <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-6xl mx-auto space-y-10">
      {/* ── Hero ────────────────────────────────────────────── */}
      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          / Admin
        </p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
          {t.admin.dashboard}
        </h1>
        <p className="text-muted-foreground text-base max-w-prose">
          {t.admin.overview}
        </p>
      </header>

      {/* ── Six illustrated entry cards ─────────────────────── */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {entryCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex aspect-square flex-col items-center justify-between rounded-2xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:-translate-y-0.5"
            >
              <div className="flex flex-1 w-full items-center justify-center pt-1">
                <Illustration
                  name={card.illustration}
                  alt=""
                  size="sm"
                  className="opacity-90 group-hover:opacity-100 transition-opacity"
                />
              </div>
              <p className="mt-2 text-sm font-medium text-center text-foreground tracking-tight">
                {card.label}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Lower split: Recent activity + Stats ─────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent referrals — takes 2/3 width on lg+ */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                / Activity
              </p>
              <h2 className="text-base font-medium tracking-tight text-foreground">
                {isEn ? "Recent referrals" : "Parrainages récents"}
              </h2>
            </div>
            {referrals.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                render={<Link href="/admin/referrals" />}
              >
                {isEn ? "View all" : "Voir tout"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {referrals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center text-center py-12">
                <Illustration name="admin-empty" alt="" size="md" />
                <p className="mt-4 text-sm text-muted-foreground">
                  {isEn ? "No referrals yet" : "Aucun parrainage pour le moment"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border/60">
                  {referrals.slice(0, 5).map((ref) => {
                    const referrerName =
                      ref.referrer?.name || ref.referrer?.email?.split("@")[0] || "?";
                    const referredName =
                      ref.referred?.name || ref.referred?.email?.split("@")[0] || "?";
                    const date = new Date(ref.created_at).toLocaleDateString(
                      isEn ? "en-US" : "fr-FR",
                      { month: "short", day: "numeric" }
                    );

                    return (
                      <div key={ref.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 shrink-0">
                          <Gift className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">
                            <span className="font-medium">{referredName}</span>
                            <span className="text-muted-foreground">
                              {isEn ? " signed up via " : " inscrit via "}
                            </span>
                            <span className="font-medium">{referrerName}</span>
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground/70 mt-0.5 truncate">
                            {ref.referred?.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            className={
                              ref.status === "rewarded"
                                ? "bg-primary/15 text-primary"
                                : "bg-amber-500/15 text-amber-500"
                            }
                          >
                            {ref.status === "rewarded"
                              ? isEn ? "Rewarded" : "Récompensé"
                              : isEn ? "Pending" : "En attente"}
                          </Badge>
                          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                            {date}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Stats sidebar — glanceable status readouts */}
        <aside className="space-y-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
              / Stats
            </p>
            <h2 className="text-base font-medium tracking-tight text-foreground">
              {isEn ? "At a glance" : "En un coup d'œil"}
            </h2>
          </div>

          <div className="space-y-2">
            {statRows.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-4 py-3"
              >
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <span className="font-mono text-base font-medium text-foreground tabular-nums">
                  {typeof stat.value === "number"
                    ? stat.value.toLocaleString()
                    : stat.value}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

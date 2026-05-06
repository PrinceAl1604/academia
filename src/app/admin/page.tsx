"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Gift } from "lucide-react";
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

  /* ─── Data fetch ───────────────────────────────────────────
   * Was: six count: "exact" queries on every load (forced full
   * scans on users, courses, enrollments) + a serial referrals
   * fetch + a fire-and-forget syncAllCourseTotals() that fanned
   * out N+1 work to recompute counters DB triggers already keep
   * fresh. Total: ~2-5s of waste on every admin visit.
   *
   * Now: one Postgres function (admin_dashboard_stats) that
   * does three table scans and returns the six counts as JSON,
   * plus the referrals fetch in parallel. syncAllCourseTotals()
   * is gone — DB triggers handle that on insert/update. */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      type StatsRpc = {
        total_students: number;
        pro_students: number;
        total_courses: number;
        published_courses: number;
        total_enrollments: number;
        recent_signups: number;
      };
      const [statsRes, referralsRes] = await Promise.all([
        supabase.rpc("admin_dashboard_stats"),
        fetch("/api/admin/referrals")
          .then((r) => (r.ok ? r.json() : { referrals: [] }))
          .catch(() => ({ referrals: [] as Referral[] })),
      ]);
      if (cancelled) return;

      const data = statsRes.data as StatsRpc | null;
      if (data) {
        setStats({
          totalStudents: data.total_students ?? 0,
          proStudents: data.pro_students ?? 0,
          totalCourses: data.total_courses ?? 0,
          publishedCourses: data.published_courses ?? 0,
          totalEnrollments: data.total_enrollments ?? 0,
          recentSignups: data.recent_signups ?? 0,
        });
      }
      setReferrals(referralsRes.referrals ?? []);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

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

      {/* ── Six illustrated entry cards ───────────────────────
           Refactoring UI move: each card uses the same outer
           aspect ratio (5/6 — slightly taller than square, gives
           the label its own row) AND a fixed-size illustration box
           (xs = 96px) regardless of the SVG's natural aspect ratio.
           Result: the system holds even when illustrations have
           wildly different intrinsic dimensions. */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {entryCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex aspect-[5/6] flex-col items-center justify-end rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-border hover:-translate-y-0.5"
            >
              <div className="flex flex-1 items-center justify-center w-full">
                <Illustration
                  name={card.illustration}
                  alt=""
                  size="xs"
                  fit
                  className="group-hover:opacity-100 transition-opacity"
                />
              </div>
              <p className="text-sm font-medium text-center text-foreground tracking-tight leading-tight">
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

          {loading ? (
            // Skeleton: 3 referral-row placeholders. Same vertical
            // rhythm as the real rows so the layout doesn't jump
            // when data arrives.
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border/60">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="h-9 w-9 rounded-full bg-muted animate-pulse shrink-0" />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="h-3.5 w-3/5 rounded bg-muted animate-pulse" />
                        <div className="h-2.5 w-2/5 rounded bg-muted/70 animate-pulse" />
                      </div>
                      <div className="h-5 w-16 rounded-full bg-muted animate-pulse shrink-0" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : referrals.length === 0 ? (
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
                {loading ? (
                  // Skeleton bar — matches the real value's font
                  // size so the row height doesn't jump on swap.
                  <span className="h-5 w-10 rounded bg-muted animate-pulse" />
                ) : (
                  <span className="font-mono text-base font-medium text-foreground tabular-nums">
                    {typeof stat.value === "number"
                      ? stat.value.toLocaleString()
                      : stat.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

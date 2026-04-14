"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { syncAllCourseTotals } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  BookOpen,
  Crown,
  ArrowRight,
  Plus,
  BarChart3,
  Loader2,
  TrendingUp,
  Gift,
  Sparkles,
  Activity,
} from "lucide-react";

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

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const { userName } = useAuth();
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

      // Fetch recent referrals via admin API (bypasses RLS)
      try {
        const res = await fetch("/api/admin/referrals");
        if (res.ok) {
          const json = await res.json();
          setReferrals(json.referrals ?? []);
        }
      } catch {}

      setLoading(false);

      // Sync all course totals in the background (fixes stale 0 values)
      syncAllCourseTotals();
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Derived context for stats ─────────────────────────────
  const proConversion = stats && stats.totalStudents > 0
    ? Math.round((stats.proStudents / stats.totalStudents) * 100)
    : 0;
  const publishRate = stats && stats.totalCourses > 0
    ? Math.round((stats.publishedCourses / stats.totalCourses) * 100)
    : 0;

  const firstName = (userName || "Admin").split(" ")[0];
  const hour = new Date().getHours();
  const greet = isEn
    ? hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
    : hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  const statCards = [
    {
      label: t.admin.totalStudents,
      value: stats?.totalStudents ?? 0,
      context: `+${stats?.recentSignups ?? 0} ${isEn ? "this month" : "ce mois"}`,
      icon: Users,
      tint: "bg-blue-100/60 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
    },
    {
      label: t.admin.proSubscribers,
      value: stats?.proStudents ?? 0,
      context: `${proConversion}% ${isEn ? "conversion" : "conversion"}`,
      icon: Crown,
      tint: "bg-amber-100/60 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
    },
    {
      label: t.admin.totalCourses,
      value: stats?.totalCourses ?? 0,
      context: `${stats?.publishedCourses ?? 0} ${isEn ? "published" : "publiés"} · ${publishRate}%`,
      icon: BookOpen,
      tint: "bg-purple-100/60 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300",
    },
    {
      label: isEn ? "Enrollments" : "Inscriptions",
      value: stats?.totalEnrollments ?? 0,
      context: isEn ? "All-time" : "Depuis toujours",
      icon: Activity,
      tint: "bg-primary/10 text-primary",
    },
  ];

  const quickActions = [
    {
      label: t.admin.addCourse,
      description: t.admin.createNewCourse,
      href: "/admin/courses/new",
      icon: Plus,
      tint: "bg-primary/10 text-primary",
    },
    {
      label: t.admin.manageCourses,
      description: t.admin.editOrDeleteCourses,
      href: "/admin/courses",
      icon: BookOpen,
      tint: "bg-purple-100/60 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300",
    },
    {
      label: t.admin.viewAnalytics,
      description: t.admin.detailedAnalytics,
      href: "/admin/analytics",
      icon: BarChart3,
      tint: "bg-blue-100/60 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
    },
  ];

  return (
    <div className="space-y-8">
      {/* ─── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 ring-1 ring-primary/15">
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              {isEn ? "Admin overview" : "Vue d'ensemble admin"}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {greet}, {firstName}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              {isEn
                ? `You have ${stats?.recentSignups ?? 0} new signups and ${stats?.totalEnrollments ?? 0} total enrollments across ${stats?.publishedCourses ?? 0} published courses.`
                : `Vous avez ${stats?.recentSignups ?? 0} nouvelles inscriptions et ${stats?.totalEnrollments ?? 0} inscriptions au total sur ${stats?.publishedCourses ?? 0} cours publiés.`}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              render={<Link href="/admin/courses/new" />}
              size="lg"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t.admin.addCourse}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              render={<Link href="/admin/analytics" />}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">{t.admin.analytics}</span>
            </Button>
          </div>
        </div>

        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-amber-200/20 blur-3xl dark:bg-amber-500/10" />
      </section>

      {/* ─── Stat cards ───────────────────────────────────── */}
      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex flex-col gap-4 p-1">
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.tint}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground/60" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">
                    {typeof stat.value === "number"
                      ? stat.value.toLocaleString()
                      : stat.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.context}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── Quick actions ────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {t.admin.quickActions}
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group block"
            >
              <Card className="h-full transition-all hover:ring-primary/30 hover:shadow-sm">
                <CardContent className="flex h-full flex-col gap-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${action.tint}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{action.label}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                    {isEn ? "Open" : "Ouvrir"}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Activity split ───────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Recent Referrals */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">
                  {isEn ? "Recent Referrals" : "Parrainages récents"}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="xs"
                className="gap-1 text-muted-foreground"
                render={<Link href="/admin/referrals" />}
              >
                {isEn ? "View all" : "Voir tout"}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            {referrals.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                {isEn ? "No referrals yet" : "Aucun parrainage"}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {referrals.slice(0, 5).map((ref) => {
                  const referrerName = ref.referrer?.name || ref.referrer?.email?.split("@")[0] || "?";
                  const referredName = ref.referred?.name || ref.referred?.email?.split("@")[0] || "?";
                  const date = new Date(ref.created_at).toLocaleDateString(
                    isEn ? "en-US" : "fr-FR",
                    { month: "short", day: "numeric" }
                  );

                  return (
                    <div key={ref.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100/60 dark:bg-amber-900/20">
                        <Gift className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">{referredName}</span>
                          <span className="text-muted-foreground">
                            {isEn ? " via " : " par "}
                          </span>
                          <span className="font-medium">{referrerName}</span>
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {ref.referred?.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={
                            ref.status === "rewarded"
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-amber-300/60 bg-amber-100/50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"
                          }
                        >
                          {ref.status === "rewarded"
                            ? (isEn ? "Rewarded" : "Récompensé")
                            : (isEn ? "Pending" : "En attente")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{date}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pulse panel */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  {isEn ? "Platform pulse" : "Pouls de la plateforme"}
                </h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <PulseRow
                label={isEn ? "Pro conversion" : "Conversion Pro"}
                value={`${proConversion}%`}
                percent={proConversion}
                hint={`${stats?.proStudents ?? 0} / ${stats?.totalStudents ?? 0}`}
              />
              <PulseRow
                label={isEn ? "Catalog published" : "Catalogue publié"}
                value={`${publishRate}%`}
                percent={publishRate}
                hint={`${stats?.publishedCourses ?? 0} / ${stats?.totalCourses ?? 0}`}
              />
              <PulseRow
                label={isEn ? "Avg enrollments / course" : "Moy. insc. / cours"}
                value={
                  stats && stats.publishedCourses > 0
                    ? (stats.totalEnrollments / stats.publishedCourses).toFixed(1)
                    : "0"
                }
                percent={Math.min(
                  stats && stats.publishedCourses > 0
                    ? (stats.totalEnrollments / stats.publishedCourses) * 10
                    : 0,
                  100
                )}
                hint={`${stats?.totalEnrollments ?? 0} ${isEn ? "total" : "total"}`}
              />
              <PulseRow
                label={isEn ? "Growth (30d)" : "Croissance (30j)"}
                value={`+${stats?.recentSignups ?? 0}`}
                percent={Math.min((stats?.recentSignups ?? 0) * 5, 100)}
                hint={isEn ? "new students" : "nouveaux étudiants"}
              />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

/* ─── Helper: Pulse row w/ mini progress ────────────────── */
function PulseRow({
  label,
  value,
  percent,
  hint,
}: {
  label: string;
  value: string;
  percent: number;
  hint: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {value}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">{hint}</span>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
}

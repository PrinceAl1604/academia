"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Check,
  Loader2,
  User,
  Palette,
  Bell,
  CreditCard,
  Shield,
  Moon,
  Sun,
  Lock,
  Crown,
  Key,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  X,
  Copy,
  Gift,
  Eye,
  EyeOff,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "profile", icon: User },
  { id: "appearance", icon: Palette },
  { id: "notifications", icon: Bell },
  { id: "subscription", icon: CreditCard },
  { id: "security", icon: Shield },
] as const;

type Tab = (typeof tabs)[number]["id"];

interface NotificationPrefs {
  // Email preferences (used by cron — kept as-is for compatibility)
  course_updates: boolean;
  new_courses: boolean;
  weekly_digest: boolean;
  promotional: boolean;
  // In-app notifications: array of muted notification types. The
  // create_notification SQL helper checks this and short-circuits
  // before inserting, so muted notifications never hit the table or
  // the bell badge.
  muted_types?: string[];
}

const DEFAULT_NOTIF: NotificationPrefs = {
  course_updates: true,
  new_courses: true,
  weekly_digest: false,
  promotional: false,
  muted_types: [],
};

/**
 * Notification categories — group several DB types under one toggle
 * for a sane UX (no one wants 9 individual switches for "session
 * booked" / "session reminder" / "session live" / etc.).
 */
const NOTIF_CATEGORIES: Array<{
  id: string;
  labelKey: string;
  types: string[];
}> = [
  { id: "dm", labelKey: "typeLabelDmMessage", types: ["dm_message"] },
  { id: "mention", labelKey: "typeLabelChatMention", types: ["chat_mention"] },
  { id: "announcement", labelKey: "typeLabelAnnouncement", types: ["announcement"] },
  { id: "new_course", labelKey: "typeLabelNewCourse", types: ["new_course"] },
  {
    id: "session",
    labelKey: "typeLabelSession",
    types: [
      "session_booked",
      "session_reminder",
      "session_live",
      "session_cancelled",
      "session_updated",
    ],
  },
  {
    id: "pro",
    labelKey: "typeLabelPro",
    types: ["pro_expiring", "pro_renewed", "pro_expired"],
  },
  {
    id: "referral",
    labelKey: "typeLabelReferral",
    types: ["referral_signup", "referral_rewarded"],
  },
];

export default function SettingsPage() {
  const { user, userName, isPro, proExpiresAt, daysUntilExpiry, isExpiringSoon, logout, referralCode } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Profile
  const [name, setName] = useState(userName || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Appearance
  const [darkMode, setDarkMode] = useState(false);

  // Subscription
  const [licenceKey, setLicenceKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keySuccess, setKeySuccess] = useState(false);

  // Security
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Notifications (persisted to DB)
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIF);
  const [notifLoaded, setNotifLoaded] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  // Referral code copy
  const [codeCopied, setCodeCopied] = useState(false);

  // Delete account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load dark mode
  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  // Load notification preferences from DB
  useEffect(() => {
    if (!user) return;
    supabase
      .from("users")
      .select("notification_preferences")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.notification_preferences) {
          setNotifPrefs({ ...DEFAULT_NOTIF, ...data.notification_preferences });
        }
        setNotifLoaded(true);
      });
  }, [user]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", !darkMode ? "dark" : "light");
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("users").update({ name }).eq("id", user.id);
    await supabase.auth.updateUser({ data: { full_name: name } });
    // Force session refresh so sidebar/topbar pick up the new name immediately
    await supabase.auth.refreshSession();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Toggle a single notification pref and persist
  const handleToggleNotif = useCallback(
    async (key: keyof NotificationPrefs) => {
      if (!user) return;
      const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
      setNotifPrefs(updated);
      setNotifSaving(true);
      setNotifSaved(false);
      await supabase
        .from("users")
        .update({ notification_preferences: updated })
        .eq("id", user.id);
      setNotifSaving(false);
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2000);
    },
    [user, notifPrefs]
  );

  /**
   * Toggle an in-app notification category. Each category maps to one
   * or more notification `type` values (defined in NOTIF_CATEGORIES).
   * "Enabled" = NONE of the types are muted; "Disabled" = ALL of the
   * types are muted. The trigger function reads muted_types and
   * short-circuits before inserting — so muted categories never even
   * generate a notification row.
   */
  const handleToggleCategory = useCallback(
    async (types: string[]) => {
      if (!user) return;
      const currentMuted = new Set(notifPrefs.muted_types ?? []);
      const allMuted = types.every((tt) => currentMuted.has(tt));
      // Flip: if all muted, unmute all; otherwise mute all.
      if (allMuted) {
        types.forEach((tt) => currentMuted.delete(tt));
      } else {
        types.forEach((tt) => currentMuted.add(tt));
      }
      const updated: NotificationPrefs = {
        ...notifPrefs,
        muted_types: Array.from(currentMuted),
      };
      setNotifPrefs(updated);
      setNotifSaving(true);
      setNotifSaved(false);
      await supabase
        .from("users")
        .update({ notification_preferences: updated })
        .eq("id", user.id);
      setNotifSaving(false);
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2000);
    },
    [user, notifPrefs]
  );

  const handleActivateKey = async () => {
    if (!licenceKey.trim() || !user) return;
    setActivating(true);
    setKeyError(null);
    try {
      const res = await fetch("/api/licence/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: licenceKey.trim(), user_id: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setKeySuccess(true);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setKeyError(data.error || "Invalid licence key");
      }
    } catch {
      setKeyError("Something went wrong");
    }
    setActivating(false);
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword.length < 6) {
      setPasswordError(t.settings.passwordMinError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t.settings.passwordMismatch);
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setTimeout(() => setPasswordSuccess(false), 3000);
      // Send confirmation email (fire-and-forget)
      fetch("/api/email/password-changed", { method: "POST" }).catch(() => {});
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail: deleteConfirmEmail }),
      });
      const data = await res.json();
      if (data.success) {
        // Sign out and redirect to home
        await logout();
      } else {
        setDeleteError(data.error || "Failed to delete account");
        setDeleting(false);
      }
    } catch {
      setDeleteError("Something went wrong");
      setDeleting(false);
    }
  };

  const tabLabels: Record<Tab, string> = {
    profile: t.settings.profileTab,
    appearance: t.settings.appearanceTab,
    notifications: t.settings.notifications,
    subscription: t.settings.subscriptionTab,
    security: t.settings.securityTab,
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t.settings.title}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {t.settings.manageAccount}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          {/* Sidebar tabs */}
          <nav className="hidden sm:block w-48 shrink-0 space-y-1" role="tablist" aria-label={t.settings.title}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground dark:text-muted-foreground/70"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tabLabels[tab.id]}
              </button>
            ))}
          </nav>

          {/* Mobile tabs */}
          <div className="sm:hidden flex gap-1 overflow-x-auto pb-2 mb-4 w-full" role="tablist" aria-label={t.settings.title}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors",
                  activeTab === tab.id
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground dark:text-muted-foreground/70"
                )}
              >
                <tab.icon className="h-3 w-3" />
                {tabLabels[tab.id]}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 max-w-2xl" role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
            {/* ─── Profile ──────────────────────────────────────── */}
            {activeTab === "profile" && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground">
                  {t.settings.personalInfo}
                </h3>
                <Separator className="my-4" />

                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-muted text-lg font-semibold dark:text-muted-foreground/70">
                      {(userName || "U").split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{userName || "User"}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge className={isPro ? "bg-amber-100 text-amber-700" : ""}>
                        {isPro ? "Pro" : "Free"}
                      </Badge>
                      {user?.created_at && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                          <Calendar className="h-3 w-3" />
                          {t.profile.memberSince} {new Date(user.created_at).toLocaleDateString(language === "en" ? "en-US" : "fr-FR", { month: "short", year: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="dark:text-muted-foreground/70">{t.settings.fullName}</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="dark:bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-muted-foreground/70">Email</Label>
                    <Input value={user?.email || ""} disabled className="opacity-60" />
                    <p className="text-xs text-muted-foreground/70">{t.settings.emailCantChange}</p>
                  </div>

                  {/* Referral code */}
                  {referralCode && (
                    <div className="space-y-2">
                      <Label className="dark:text-muted-foreground/70 flex items-center gap-1.5">
                        <Gift className="h-3.5 w-3.5 text-amber-500" />
                        {t.referral.referralCode}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={referralCode}
                          readOnly
                          className="font-mono text-sm tracking-wider uppercase opacity-80"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(referralCode);
                            setCodeCopied(true);
                            setTimeout(() => setCodeCopied(false), 2000);
                          }}
                        >
                          {codeCopied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground/70">
                        {t.referral.codeHint}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 justify-end pt-2">
                    {saved && (
                      <span className="flex items-center gap-1 text-sm text-primary">
                        <Check className="h-4 w-4" /> {t.settings.saved}
                      </span>
                    )}
                    <Button onClick={handleSaveProfile} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t.settings.saveChanges}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* ─── Appearance ────────────────────────────────────── */}
            {activeTab === "appearance" && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground">
                  {t.settings.appearance}
                </h3>
                <Separator className="my-4" />

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {darkMode ? <Moon className="h-5 w-5 text-muted-foreground/70" /> : <Sun className="h-5 w-5 text-amber-500" />}
                      <div>
                        <Label className="dark:text-muted-foreground/70">{t.settings.darkMode}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t.settings.darkModeDesc}
                        </p>
                      </div>
                    </div>
                    <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
                  </div>

                  <Separator className="dark:bg-muted" />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Label className="dark:text-muted-foreground/70">{t.settings.language}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t.settings.languageChoose}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setLanguage("fr")}
                        className={cn(
                          "rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4",
                          language === "fr"
                            ? "bg-foreground text-background"
                            : "bg-muted text-muted-foreground dark:text-muted-foreground/70"
                        )}
                      >
                        Fran\u00e7ais
                      </button>
                      <button
                        onClick={() => setLanguage("en")}
                        className={cn(
                          "rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4",
                          language === "en"
                            ? "bg-foreground text-background"
                            : "bg-muted text-muted-foreground dark:text-muted-foreground/70"
                        )}
                      >
                        English
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* ─── Notifications ─────────────────────────────────── */}
            {activeTab === "notifications" && (
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">{t.settings.notifications}</h3>
                  {notifSaving && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                      <Loader2 className="h-3 w-3 animate-spin" /> {t.settings.notifSaving}
                    </span>
                  )}
                  {notifSaved && !notifSaving && (
                    <span className="flex items-center gap-1.5 text-xs text-primary">
                      <Check className="h-3 w-3" /> {t.settings.notifSaved}
                    </span>
                  )}
                </div>
                <Separator className="my-4" />

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="dark:text-muted-foreground/70">{t.settings.courseUpdates}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t.settings.courseUpdatesDesc}
                      </p>
                    </div>
                    <Switch
                      checked={notifPrefs.course_updates}
                      onCheckedChange={() => handleToggleNotif("course_updates")}
                      disabled={!notifLoaded}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="dark:text-muted-foreground/70">{t.settings.newCourses}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t.settings.newCoursesDesc}
                      </p>
                    </div>
                    <Switch
                      checked={notifPrefs.new_courses}
                      onCheckedChange={() => handleToggleNotif("new_courses")}
                      disabled={!notifLoaded}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="dark:text-muted-foreground/70">{t.settings.weeklyDigest}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t.settings.weeklyDigestDesc}
                      </p>
                    </div>
                    <Switch
                      checked={notifPrefs.weekly_digest}
                      onCheckedChange={() => handleToggleNotif("weekly_digest")}
                      disabled={!notifLoaded}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="dark:text-muted-foreground/70">{t.settings.promotional}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t.settings.promotionalDesc}
                      </p>
                    </div>
                    <Switch
                      checked={notifPrefs.promotional}
                      onCheckedChange={() => handleToggleNotif("promotional")}
                      disabled={!notifLoaded}
                    />
                  </div>
                </div>

                {/* ─── In-app notifications (per-type mute) ──────
                     The toggles above govern EMAIL preferences (used by
                     the daily cron). The toggles below govern IN-APP
                     bell notifications. Stored as muted_types[] in the
                     same notification_preferences jsonb — checked by
                     the create_notification SQL helper before insert. */}
                <Separator className="my-6" />
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-1">
                    {t.notifications?.preferencesTitle ||
                      "In-app notifications"}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-4">
                    {t.notifications?.preferencesSubtitle ||
                      "Choose which notifications you want to receive in the app."}
                  </p>
                  <div className="space-y-4">
                    {NOTIF_CATEGORIES.map((cat) => {
                      const muted = (notifPrefs.muted_types ?? []);
                      const allMuted = cat.types.every((tt) =>
                        muted.includes(tt)
                      );
                      const enabled = !allMuted;
                      const labelKey = cat.labelKey as keyof typeof t.notifications;
                      const label =
                        (t.notifications &&
                          (t.notifications[labelKey] as string | undefined)) ||
                        cat.id;
                      return (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between gap-4"
                        >
                          <Label className="text-sm font-normal text-foreground">
                            {label}
                          </Label>
                          <Switch
                            checked={enabled}
                            onCheckedChange={() => handleToggleCategory(cat.types)}
                            disabled={!notifLoaded}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            )}

            {/* ─── Subscription ─────────────────────────────────── */}
            {activeTab === "subscription" && (
              <div className="space-y-6">
                {/* Current Plan */}
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full",
                        isPro ? "bg-amber-100" : "bg-muted"
                      )}>
                        <Crown className={cn("h-5 w-5", isPro ? "text-amber-600" : "text-muted-foreground/70")} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {isPro ? t.settings.proPlan : t.settings.freePlan}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {isPro ? t.settings.proFullAccess : t.settings.freeCoursesOnly}
                        </p>
                      </div>
                    </div>
                    <Badge className={isPro ? "bg-amber-100 text-amber-700" : ""}>
                      {isPro ? t.settings.activeStatus : "Free"}
                    </Badge>
                  </div>

                  {isPro && proExpiresAt && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                        <div>
                          <p className="text-xs text-muted-foreground">{t.settings.expiresOn}</p>
                          <p className="text-sm font-medium text-foreground">
                            {new Date(proExpiresAt).toLocaleDateString(language === "en" ? "en-US" : "fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        </div>
                        {isExpiringSoon && (
                          <Badge className="bg-amber-100 text-amber-700">
                            {daysUntilExpiry}{t.settings.daysLeft}
                          </Badge>
                        )}
                      </div>
                    </>
                  )}
                </Card>

                {/* Upgrade / Renew */}
                {!isPro || isExpiringSoon ? (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-foreground">
                      {isPro ? t.settings.renewSub : t.settings.upgradePro}
                    </h3>
                    <Separator className="my-4" />

                    {/* Step 1: Pay */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background shrink-0">1</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {t.settings.purchaseKey}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          15,000 FCFA / {t.settings.month} (~$27 USD)
                        </p>
                        <Button
                          className="mt-3 gap-2"
                          size="sm"
                          onClick={() => {
                            const url = "https://jwxfcqrf.mychariow.shop/prd_o6clpf/checkout";
                            window.open(url, "brightroots-checkout", `width=500,height=700,left=${(screen.width - 500) / 2},top=${(screen.height - 700) / 2}`);
                          }}
                        >
                          <Crown className="h-3.5 w-3.5" />
                          {t.settings.buyNow}
                        </Button>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Step 2: Activate */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background shrink-0">2</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {t.settings.activateKey}
                        </p>

                        {keySuccess ? (
                          <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/10 p-3">
                            <CheckCircle className="h-4 w-4 text-primary" />
                            <p className="text-sm text-primary">{t.settings.proActivated}</p>
                          </div>
                        ) : (
                          <div className="mt-3 flex gap-2">
                            <div className="relative flex-1">
                              <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                              <Input
                                placeholder="XXXX-XXXX-XXXX-XXXX"
                                className="pl-10 font-mono text-sm uppercase"
                                value={licenceKey}
                                onChange={(e) => { setLicenceKey(e.target.value); setKeyError(null); }}
                                onKeyDown={(e) => e.key === "Enter" && handleActivateKey()}
                              />
                            </div>
                            <Button size="sm" className="gap-1.5" onClick={handleActivateKey} disabled={activating || !licenceKey.trim()}>
                              {activating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                              {t.settings.activateBtn}
                            </Button>
                          </div>
                        )}
                        {keyError && <p className="mt-2 text-xs text-red-500">{keyError}</p>}
                      </div>
                    </div>
                  </Card>
                ) : null}
              </div>
            )}

            {/* ─── Security ──────────────────────────────────────── */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-foreground">
                      {t.settings.changePassword}
                    </h3>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="dark:text-muted-foreground/70">{t.settings.newPassword}</Label>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pr-12"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-muted-foreground/70">{t.settings.confirmPassword}</Label>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pr-12"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
                    {passwordSuccess && <p className="text-xs text-primary">{t.settings.passwordUpdated}</p>}
                    <Button onClick={handleChangePassword} disabled={passwordSaving || !newPassword}>
                      {passwordSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {t.settings.updatePassword}
                    </Button>
                  </div>
                </Card>

                <Card className="border-red-200 dark:border-red-900/50 p-6">
                  <h3 className="text-lg font-semibold text-red-600">{t.settings.dangerZone}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.settings.irreversible}
                  </p>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.settings.deleteAccount}</p>
                      <p className="text-sm text-muted-foreground">{t.settings.deleteDesc}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteModal(true)}
                    >
                      {t.settings.deleteBtn}
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Delete Account Confirmation Modal ─────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {t.settings.deleteConfirmTitle}
                </h3>
              </div>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmEmail(""); setDeleteError(null); }}
                className="rounded-lg p-1 text-muted-foreground/70 hover:bg-muted hover:text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              {t.settings.deleteConfirmDesc}
            </p>

            <div className="mt-4 space-y-2">
              <Label className="text-sm text-foreground/90">
                {t.settings.deleteConfirmLabel}
              </Label>
              <Input
                type="email"
                placeholder={user?.email || ""}
                value={deleteConfirmEmail}
                onChange={(e) => { setDeleteConfirmEmail(e.target.value); setDeleteError(null); }}
                className="dark:bg-muted"
              />
            </div>

            {deleteError && (
              <p className="mt-3 text-xs text-red-500">{deleteError}</p>
            )}

            <div className="mt-6 flex gap-3 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmEmail(""); setDeleteError(null); }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmEmail !== user?.email}
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    {t.settings.deleting}
                  </>
                ) : (
                  t.settings.deleteConfirmBtn
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

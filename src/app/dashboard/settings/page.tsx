"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PushNotificationsToggle } from "@/components/shared/push-notifications-toggle";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AvatarUpload } from "@/components/shared/avatar-upload";
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
  // Legacy email keys — still read by some cron paths (renewal,
  // nudge). Kept for backward-compat; new dual-matrix UI also writes
  // to muted_email_categories[].
  course_updates: boolean;
  new_courses: boolean;
  weekly_digest: boolean;
  promotional: boolean;
  // In-app notifications: array of muted notification TYPE strings.
  // The create_notification SQL helper short-circuits if a row's
  // type is in here.
  muted_types?: string[];
  // Email notifications: array of muted CATEGORY ids (e.g. "session",
  // "pro"). Cron paths check this before sending.
  muted_email_categories?: string[];
}

const DEFAULT_NOTIF: NotificationPrefs = {
  course_updates: true,
  new_courses: true,
  weekly_digest: false,
  promotional: false,
  muted_types: [],
  muted_email_categories: [],
};

/**
 * Unified notification categories — each renders as one row in the
 * settings matrix with two switches (Email + In-app). When a channel
 * doesn't apply (e.g. no email for DMs yet), the row shows "—".
 *
 *  - inAppTypes: notification rows with these types get muted server-
 *    side via muted_types[] and the create_notification helper.
 *  - emailCategory: a stable id stored in muted_email_categories[].
 *    The cron consults this before sending the corresponding email.
 */
const NOTIF_CATEGORIES: Array<{
  id: string;
  labelKey: string;
  inAppTypes?: string[];
  emailCategory?: string;
}> = [
  { id: "dm", labelKey: "typeLabelDmMessage", inAppTypes: ["dm_message"] },
  { id: "mention", labelKey: "typeLabelChatMention", inAppTypes: ["chat_mention"] },
  {
    id: "announcement",
    labelKey: "typeLabelAnnouncement",
    inAppTypes: ["announcement"],
    emailCategory: "announcement",
  },
  {
    id: "new_course",
    labelKey: "typeLabelNewCourse",
    inAppTypes: ["new_course"],
    emailCategory: "new_course",
  },
  {
    id: "session",
    labelKey: "typeLabelSession",
    inAppTypes: [
      "session_booked",
      "session_reminder",
      "session_live",
      "session_cancelled",
      "session_updated",
    ],
    emailCategory: "session",
  },
  {
    id: "pro",
    labelKey: "typeLabelPro",
    inAppTypes: ["pro_expiring", "pro_renewed", "pro_expired"],
    emailCategory: "pro",
  },
  {
    id: "referral",
    labelKey: "typeLabelReferral",
    inAppTypes: ["referral_signup", "referral_rewarded"],
    emailCategory: "referral",
  },
];

export default function SettingsPage() {
  const { user, userName, isPro, proExpiresAt, daysUntilExpiry, isExpiringSoon, logout, referralCode } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  // Other places in this file use `t.nav.signIn === "Sign In"` inline;
  // hoisting to a single isEn so the new password-flow strings can
  // reference it cleanly.
  const isEn = t.nav.signIn === "Sign In";
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
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
   * Toggle an in-app notification category. Maps to one or more
   * notification type strings; flips them all in muted_types[].
   * The create_notification SQL helper short-circuits any muted
   * type before inserting.
   */
  const handleToggleInApp = useCallback(
    async (types: string[]) => {
      if (!user) return;
      const currentMuted = new Set(notifPrefs.muted_types ?? []);
      const allMuted = types.every((tt) => currentMuted.has(tt));
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

  /**
   * Toggle an email notification category. Stored as a category id
   * (e.g. "session", "pro") in muted_email_categories[]. Cron paths
   * check this before sending the corresponding email batch.
   */
  const handleToggleEmail = useCallback(
    async (category: string) => {
      if (!user) return;
      const currentMuted = new Set(notifPrefs.muted_email_categories ?? []);
      if (currentMuted.has(category)) {
        currentMuted.delete(category);
      } else {
        currentMuted.add(category);
      }
      const updated: NotificationPrefs = {
        ...notifPrefs,
        muted_email_categories: Array.from(currentMuted),
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
    if (!currentPassword) {
      setPasswordError(
        isEn
          ? "Enter your current password to confirm."
          : "Saisissez votre mot de passe actuel pour confirmer."
      );
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t.settings.passwordMinError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t.settings.passwordMismatch);
      return;
    }
    if (!user?.email) {
      setPasswordError(
        isEn
          ? "Account has no email on file."
          : "Aucun email associé au compte."
      );
      return;
    }
    setPasswordSaving(true);

    // Re-authenticate against the current password before allowing
    // the rotation. supabase.auth.updateUser({ password }) will
    // happily accept a new password using only the access token,
    // which means a stolen session (laptop left unlocked, hijacked
    // refresh token) lets the attacker rotate the password and
    // permanently lock the legitimate user out. Forcing a fresh
    // signInWithPassword here turns this into a per-action
    // re-auth: the attacker would need the current password too.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauthError) {
      setPasswordSaving(false);
      setPasswordError(
        isEn
          ? "Current password is incorrect."
          : "Mot de passe actuel incorrect."
      );
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
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

                {/* Avatar uploader — replaces the static initials-only
                    block. AvatarUpload renders the current image (or
                    fallback initials) plus Upload/Change/Remove
                    buttons, and writes through to users.avatar_url +
                    auth-context state on success. */}
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                  <AvatarUpload
                    fallback={(userName || "U")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  />
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

                <p className="text-sm text-muted-foreground mb-4">
                  {t.notifications?.preferencesSubtitle ||
                    "Choose how you want to be notified for each category."}
                </p>

                {/* Push subscription toggle — system-level pushes when
                     the tab is closed. Only shown if the browser
                     supports the Web Push API (component renders nothing
                     otherwise). */}
                <div className="mb-6">
                  <PushNotificationsToggle />
                </div>


                {/* ─── 2-column matrix: Email · In-app ──────────
                     Each category has up to two switches. Categories
                     where one channel doesn't apply (e.g. DMs have no
                     email today) render "—" in that column.

                     Storage:
                       - muted_types[] for in-app (checked by the
                         create_notification SQL helper)
                       - muted_email_categories[] for email (checked
                         by the daily-emails cron before each send)
                     Backwards-compatible with the old course_updates /
                     promotional / weekly_digest / new_courses booleans
                     — they're still written for the older cron paths. */}
                <div className="rounded-lg border border-border/60 overflow-hidden">
                  {/* Header row */}
                  <div className="grid grid-cols-[1fr_80px_80px] items-center gap-3 px-4 py-2 border-b border-border/60 bg-muted/30">
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {t.nav.signIn === "Sign In" ? "Type" : "Type"}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground text-center">
                      Email
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground text-center">
                      {t.nav.signIn === "Sign In" ? "In-app" : "App"}
                    </span>
                  </div>

                  <div className="divide-y divide-border/60">
                    {NOTIF_CATEGORIES.map((cat) => {
                      const inAppMuted = notifPrefs.muted_types ?? [];
                      const emailMuted =
                        notifPrefs.muted_email_categories ?? [];
                      const inAppOn = cat.inAppTypes
                        ? !cat.inAppTypes.every((tt) =>
                            inAppMuted.includes(tt)
                          )
                        : null;
                      const emailOn = cat.emailCategory
                        ? !emailMuted.includes(cat.emailCategory)
                        : null;
                      const labelKey =
                        cat.labelKey as keyof typeof t.notifications;
                      const label =
                        (t.notifications &&
                          (t.notifications[labelKey] as
                            | string
                            | undefined)) ||
                        cat.id;
                      return (
                        <div
                          key={cat.id}
                          className="grid grid-cols-[1fr_80px_80px] items-center gap-3 px-4 py-3"
                        >
                          <Label className="text-sm font-normal text-foreground">
                            {label}
                          </Label>
                          <div className="flex justify-center">
                            {emailOn !== null && cat.emailCategory ? (
                              <Switch
                                checked={emailOn}
                                onCheckedChange={() =>
                                  handleToggleEmail(cat.emailCategory!)
                                }
                                disabled={!notifLoaded}
                              />
                            ) : (
                              <span className="text-muted-foreground/40">
                                —
                              </span>
                            )}
                          </div>
                          <div className="flex justify-center">
                            {inAppOn !== null && cat.inAppTypes ? (
                              <Switch
                                checked={inAppOn}
                                onCheckedChange={() =>
                                  handleToggleInApp(cat.inAppTypes!)
                                }
                                disabled={!notifLoaded}
                              />
                            ) : (
                              <span className="text-muted-foreground/40">
                                —
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Email-only categories (no in-app equivalent) */}
                    <div className="grid grid-cols-[1fr_80px_80px] items-center gap-3 px-4 py-3">
                      <div>
                        <Label className="text-sm font-normal text-foreground">
                          {t.settings.weeklyDigest}
                        </Label>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          {t.settings.weeklyDigestDesc}
                        </p>
                      </div>
                      <div className="flex justify-center">
                        <Switch
                          checked={notifPrefs.weekly_digest}
                          onCheckedChange={() =>
                            handleToggleNotif("weekly_digest")
                          }
                          disabled={!notifLoaded}
                        />
                      </div>
                      <span className="text-center text-muted-foreground/40">
                        —
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_80px_80px] items-center gap-3 px-4 py-3">
                      <div>
                        <Label className="text-sm font-normal text-foreground">
                          {t.settings.promotional}
                        </Label>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          {t.settings.promotionalDesc}
                        </p>
                      </div>
                      <div className="flex justify-center">
                        <Switch
                          checked={notifPrefs.promotional}
                          onCheckedChange={() =>
                            handleToggleNotif("promotional")
                          }
                          disabled={!notifLoaded}
                        />
                      </div>
                      <span className="text-center text-muted-foreground/40">
                        —
                      </span>
                    </div>
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
                      <Label className="dark:text-muted-foreground/70">
                        {isEn ? "Current password" : "Mot de passe actuel"}
                      </Label>
                      <div className="relative">
                        <Input
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pr-12"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground"
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-muted-foreground/70">{t.settings.newPassword}</Label>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pr-12"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          autoComplete="new-password"
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
                    <Button
                      onClick={handleChangePassword}
                      disabled={passwordSaving || !currentPassword || !newPassword}
                    >
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

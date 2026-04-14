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
  course_updates: boolean;
  new_courses: boolean;
  weekly_digest: boolean;
  promotional: boolean;
}

const DEFAULT_NOTIF: NotificationPrefs = {
  course_updates: true,
  new_courses: true,
  weekly_digest: false,
  promotional: false,
};

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
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t.settings.title}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
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
                    ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-white"
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
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
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
              <Card className="p-6 dark:bg-neutral-900 dark:border-neutral-800">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {t.settings.personalInfo}
                </h3>
                <Separator className="my-4 dark:bg-neutral-800" />

                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-neutral-200 dark:bg-neutral-700 text-lg font-semibold dark:text-neutral-300">
                      {(userName || "U").split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">{userName || "User"}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{user?.email}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge className={isPro ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : ""}>
                        {isPro ? "Pro" : "Free"}
                      </Badge>
                      {user?.created_at && (
                        <span className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                          <Calendar className="h-3 w-3" />
                          {t.profile.memberSince} {new Date(user.created_at).toLocaleDateString(language === "en" ? "en-US" : "fr-FR", { month: "short", year: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="dark:text-neutral-300">{t.settings.fullName}</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="dark:bg-neutral-800 dark:border-neutral-700" />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-neutral-300">Email</Label>
                    <Input value={user?.email || ""} disabled className="opacity-60 dark:bg-neutral-800 dark:border-neutral-700" />
                    <p className="text-xs text-neutral-400">{t.settings.emailCantChange}</p>
                  </div>

                  {/* Referral code */}
                  {referralCode && (
                    <div className="space-y-2">
                      <Label className="dark:text-neutral-300 flex items-center gap-1.5">
                        <Gift className="h-3.5 w-3.5 text-amber-500" />
                        {t.referral.referralCode}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={referralCode}
                          readOnly
                          className="font-mono text-sm tracking-wider uppercase opacity-80 dark:bg-neutral-800 dark:border-neutral-700"
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
                          {codeCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-neutral-400">
                        {t.referral.codeHint}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 justify-end pt-2">
                    {saved && (
                      <span className="flex items-center gap-1 text-sm text-green-600">
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
              <Card className="p-6 dark:bg-neutral-900 dark:border-neutral-800">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {t.settings.appearance}
                </h3>
                <Separator className="my-4 dark:bg-neutral-800" />

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {darkMode ? <Moon className="h-5 w-5 text-neutral-400" /> : <Sun className="h-5 w-5 text-amber-500" />}
                      <div>
                        <Label className="dark:text-neutral-300">{t.settings.darkMode}</Label>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          {t.settings.darkModeDesc}
                        </p>
                      </div>
                    </div>
                    <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
                  </div>

                  <Separator className="dark:bg-neutral-800" />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Label className="dark:text-neutral-300">{t.settings.language}</Label>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {t.settings.languageChoose}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setLanguage("fr")}
                        className={cn(
                          "rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4",
                          language === "fr"
                            ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                            : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                        )}
                      >
                        Fran\u00e7ais
                      </button>
                      <button
                        onClick={() => setLanguage("en")}
                        className={cn(
                          "rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4",
                          language === "en"
                            ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                            : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
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
              <Card className="p-6 dark:bg-neutral-900 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{t.settings.notifications}</h3>
                  {notifSaving && (
                    <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                      <Loader2 className="h-3 w-3 animate-spin" /> {t.settings.notifSaving}
                    </span>
                  )}
                  {notifSaved && !notifSaving && (
                    <span className="flex items-center gap-1.5 text-xs text-green-600">
                      <Check className="h-3 w-3" /> {t.settings.notifSaved}
                    </span>
                  )}
                </div>
                <Separator className="my-4 dark:bg-neutral-800" />

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="dark:text-neutral-300">{t.settings.courseUpdates}</Label>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
                      <Label className="dark:text-neutral-300">{t.settings.newCourses}</Label>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
                      <Label className="dark:text-neutral-300">{t.settings.weeklyDigest}</Label>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
                      <Label className="dark:text-neutral-300">{t.settings.promotional}</Label>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
              </Card>
            )}

            {/* ─── Subscription ─────────────────────────────────── */}
            {activeTab === "subscription" && (
              <div className="space-y-6">
                {/* Current Plan */}
                <Card className="p-6 dark:bg-neutral-900 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full",
                        isPro ? "bg-amber-100 dark:bg-amber-900/30" : "bg-neutral-100 dark:bg-neutral-800"
                      )}>
                        <Crown className={cn("h-5 w-5", isPro ? "text-amber-600 dark:text-amber-400" : "text-neutral-400")} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                          {isPro ? t.settings.proPlan : t.settings.freePlan}
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          {isPro ? t.settings.proFullAccess : t.settings.freeCoursesOnly}
                        </p>
                      </div>
                    </div>
                    <Badge className={isPro ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : ""}>
                      {isPro ? t.settings.activeStatus : "Free"}
                    </Badge>
                  </div>

                  {isPro && proExpiresAt && (
                    <>
                      <Separator className="my-4 dark:bg-neutral-800" />
                      <div className="flex items-center justify-between rounded-lg bg-neutral-50 dark:bg-neutral-800 px-4 py-3">
                        <div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.settings.expiresOn}</p>
                          <p className="text-sm font-medium text-neutral-900 dark:text-white">
                            {new Date(proExpiresAt).toLocaleDateString(language === "en" ? "en-US" : "fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        </div>
                        {isExpiringSoon && (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            {daysUntilExpiry}{t.settings.daysLeft}
                          </Badge>
                        )}
                      </div>
                    </>
                  )}
                </Card>

                {/* Upgrade / Renew */}
                {!isPro || isExpiringSoon ? (
                  <Card className="p-6 dark:bg-neutral-900 dark:border-neutral-800">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                      {isPro ? t.settings.renewSub : t.settings.upgradePro}
                    </h3>
                    <Separator className="my-4 dark:bg-neutral-800" />

                    {/* Step 1: Pay */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 dark:bg-white text-xs font-bold text-white dark:text-neutral-900 shrink-0">1</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          {t.settings.purchaseKey}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
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

                    <Separator className="my-4 dark:bg-neutral-800" />

                    {/* Step 2: Activate */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 dark:bg-white text-xs font-bold text-white dark:text-neutral-900 shrink-0">2</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          {t.settings.activateKey}
                        </p>

                        {keySuccess ? (
                          <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 p-3">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <p className="text-sm text-green-700 dark:text-green-400">{t.settings.proActivated}</p>
                          </div>
                        ) : (
                          <div className="mt-3 flex gap-2">
                            <div className="relative flex-1">
                              <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                              <Input
                                placeholder="XXXX-XXXX-XXXX-XXXX"
                                className="pl-10 font-mono text-sm uppercase dark:bg-neutral-800 dark:border-neutral-700"
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
                <Card className="p-6 dark:bg-neutral-900 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-neutral-500" />
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                      {t.settings.changePassword}
                    </h3>
                  </div>
                  <Separator className="my-4 dark:bg-neutral-800" />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="dark:text-neutral-300">{t.settings.newPassword}</Label>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pr-12 dark:bg-neutral-800 dark:border-neutral-700"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-neutral-300">{t.settings.confirmPassword}</Label>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pr-12 dark:bg-neutral-800 dark:border-neutral-700"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
                    {passwordSuccess && <p className="text-xs text-green-600">{t.settings.passwordUpdated}</p>}
                    <Button onClick={handleChangePassword} disabled={passwordSaving || !newPassword}>
                      {passwordSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {t.settings.updatePassword}
                    </Button>
                  </div>
                </Card>

                <Card className="border-red-200 dark:border-red-900/50 p-6 dark:bg-neutral-900">
                  <h3 className="text-lg font-semibold text-red-600">{t.settings.dangerZone}</h3>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    {t.settings.irreversible}
                  </p>
                  <Separator className="my-4 dark:bg-neutral-800" />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">{t.settings.deleteAccount}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.settings.deleteDesc}</p>
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
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-neutral-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {t.settings.deleteConfirmTitle}
                </h3>
              </div>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmEmail(""); setDeleteError(null); }}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
              {t.settings.deleteConfirmDesc}
            </p>

            <div className="mt-4 space-y-2">
              <Label className="text-sm text-neutral-700 dark:text-neutral-300">
                {t.settings.deleteConfirmLabel}
              </Label>
              <Input
                type="email"
                placeholder={user?.email || ""}
                value={deleteConfirmEmail}
                onChange={(e) => { setDeleteConfirmEmail(e.target.value); setDeleteError(null); }}
                className="dark:bg-neutral-800 dark:border-neutral-700"
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

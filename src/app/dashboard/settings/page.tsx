"use client";

import { useState, useEffect } from "react";
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

export default function SettingsPage() {
  const { user, userName, isPro, proExpiresAt, daysUntilExpiry, isExpiringSoon } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";

  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [name, setName] = useState(userName || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [licenceKey, setLicenceKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keySuccess, setKeySuccess] = useState(false);

  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

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
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

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

  const tabLabels: Record<Tab, string> = {
    profile: isEn ? "Profile" : "Profil",
    appearance: isEn ? "Appearance" : "Apparence",
    notifications: "Notifications",
    subscription: isEn ? "Subscription" : "Abonnement",
    security: isEn ? "Security" : "Sécurité",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          {t.settings.title}
        </h1>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
          {isEn ? "Manage your account settings" : "Gérez les paramètres de votre compte"}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Sidebar tabs */}
        <nav className="hidden sm:block w-48 shrink-0 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
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
        <div className="sm:hidden flex gap-1 overflow-x-auto pb-2 mb-4 w-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
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
        <div className="flex-1 max-w-2xl">
          {/* ─── Profile ──────────────────────────────────────── */}
          {activeTab === "profile" && (
            <Card className="p-6 dark:bg-neutral-900 dark:border-neutral-800">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                {isEn ? "Personal Information" : "Informations personnelles"}
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
                  <Badge className={isPro ? "mt-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "mt-1"}>
                    {isPro ? "Pro" : "Free"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="dark:text-neutral-300">{isEn ? "Full Name" : "Nom complet"}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="dark:bg-neutral-800 dark:border-neutral-700" />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-neutral-300">Email</Label>
                  <Input value={user?.email || ""} disabled className="opacity-60 dark:bg-neutral-800 dark:border-neutral-700" />
                  <p className="text-xs text-neutral-400">{isEn ? "Email cannot be changed" : "L'email ne peut pas être modifié"}</p>
                </div>
                <div className="flex items-center gap-3 justify-end pt-2">
                  {saved && (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <Check className="h-4 w-4" /> {isEn ? "Saved" : "Enregistré"}
                    </span>
                  )}
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEn ? "Save Changes" : "Enregistrer")}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* ─── Appearance ────────────────────────────────────── */}
          {activeTab === "appearance" && (
            <Card className="p-6 dark:bg-neutral-900 dark:border-neutral-800">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                {isEn ? "Appearance" : "Apparence"}
              </h3>
              <Separator className="my-4 dark:bg-neutral-800" />

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {darkMode ? <Moon className="h-5 w-5 text-neutral-400" /> : <Sun className="h-5 w-5 text-amber-500" />}
                    <div>
                      <Label className="dark:text-neutral-300">{isEn ? "Dark Mode" : "Mode sombre"}</Label>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {isEn ? "Switch between light and dark theme" : "Basculer entre le thème clair et sombre"}
                      </p>
                    </div>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
                </div>

                <Separator className="dark:bg-neutral-800" />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Label className="dark:text-neutral-300">{isEn ? "Language" : "Langue"}</Label>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {isEn ? "Choose your preferred language" : "Choisissez votre langue"}
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
                      🇫🇷 Français
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
                      🇬🇧 English
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ─── Notifications ─────────────────────────────────── */}
          {activeTab === "notifications" && (
            <Card className="p-6 dark:bg-neutral-900 dark:border-neutral-800">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Notifications</h3>
              <Separator className="my-4 dark:bg-neutral-800" />

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="dark:text-neutral-300">{isEn ? "Course Updates" : "Mises à jour des cours"}</Label>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {isEn ? "New lessons, content changes" : "Nouvelles leçons, modifications de contenu"}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="dark:text-neutral-300">{isEn ? "New Courses" : "Nouveaux cours"}</Label>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {isEn ? "Get notified when new courses are published" : "Soyez notifié des nouveaux cours"}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="dark:text-neutral-300">{isEn ? "Weekly Digest" : "Résumé hebdomadaire"}</Label>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {isEn ? "Weekly summary of your learning progress" : "Résumé hebdomadaire de votre progression"}
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="dark:text-neutral-300">{isEn ? "Promotional" : "Promotionnel"}</Label>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {isEn ? "Special offers and discounts" : "Offres spéciales et réductions"}
                    </p>
                  </div>
                  <Switch />
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
                        {isPro ? "Pro Plan" : "Free Plan"}
                      </h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {isPro
                          ? (isEn ? "Full access to all courses" : "Accès complet à tous les cours")
                          : (isEn ? "Access to free courses only" : "Accès aux cours gratuits uniquement")}
                      </p>
                    </div>
                  </div>
                  <Badge className={isPro ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : ""}>
                    {isPro ? (isEn ? "Active" : "Actif") : "Free"}
                  </Badge>
                </div>

                {isPro && proExpiresAt && (
                  <>
                    <Separator className="my-4 dark:bg-neutral-800" />
                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 dark:bg-neutral-800 px-4 py-3">
                      <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{isEn ? "Expires on" : "Expire le"}</p>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          {new Date(proExpiresAt).toLocaleDateString(isEn ? "en-US" : "fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                      {isExpiringSoon && (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          {daysUntilExpiry}{isEn ? "d left" : "j restants"}
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
                    {isPro ? (isEn ? "Renew Subscription" : "Renouveler") : (isEn ? "Upgrade to Pro" : "Passer à Pro")}
                  </h3>
                  <Separator className="my-4 dark:bg-neutral-800" />

                  {/* Step 1: Pay */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 dark:bg-white text-xs font-bold text-white dark:text-neutral-900 shrink-0">1</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        {isEn ? "Purchase a licence key" : "Achetez une clé de licence"}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        15,000 FCFA / {isEn ? "month" : "mois"} (~$27 USD)
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
                        {isEn ? "Buy Now" : "Acheter"}
                      </Button>
                    </div>
                  </div>

                  <Separator className="my-4 dark:bg-neutral-800" />

                  {/* Step 2: Activate */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 dark:bg-white text-xs font-bold text-white dark:text-neutral-900 shrink-0">2</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        {isEn ? "Activate your key" : "Activez votre clé"}
                      </p>

                      {keySuccess ? (
                        <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 p-3">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <p className="text-sm text-green-700 dark:text-green-400">{isEn ? "Pro activated!" : "Pro activé !"}</p>
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
                            {isEn ? "Activate" : "Activer"}
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
                    {isEn ? "Change Password" : "Changer le mot de passe"}
                  </h3>
                </div>
                <Separator className="my-4 dark:bg-neutral-800" />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="dark:text-neutral-300">{isEn ? "New Password" : "Nouveau mot de passe"}</Label>
                    <Input type="password" placeholder="••••••••" className="dark:bg-neutral-800 dark:border-neutral-700" />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-neutral-300">{isEn ? "Confirm Password" : "Confirmer"}</Label>
                    <Input type="password" placeholder="••••••••" className="dark:bg-neutral-800 dark:border-neutral-700" />
                  </div>
                  <Button>{isEn ? "Update Password" : "Mettre à jour"}</Button>
                </div>
              </Card>

              <Card className="border-red-200 dark:border-red-900/50 p-6 dark:bg-neutral-900">
                <h3 className="text-lg font-semibold text-red-600">{isEn ? "Danger Zone" : "Zone de danger"}</h3>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {isEn ? "Irreversible actions" : "Actions irréversibles"}
                </p>
                <Separator className="my-4 dark:bg-neutral-800" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{isEn ? "Delete Account" : "Supprimer le compte"}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{isEn ? "Permanently remove your account and data" : "Supprimez définitivement votre compte"}</p>
                  </div>
                  <Button variant="destructive" size="sm">{isEn ? "Delete" : "Supprimer"}</Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

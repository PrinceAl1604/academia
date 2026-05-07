"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Check,
  Loader2,
  User,
  Palette,
  Bell,
  Globe,
  Shield,
  Moon,
  Sun,
  Lock,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "profile", icon: User },
  { id: "appearance", icon: Palette },
  { id: "notifications", icon: Bell },
  { id: "platform", icon: Globe },
  { id: "security", icon: Shield },
] as const;

type Tab = (typeof tabs)[number]["id"];

export default function AdminSettingsPage() {
  const { user, userName } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";

  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [name, setName] = useState(userName || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

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

  const tabLabels: Record<Tab, string> = {
    profile: isEn ? "Profile" : "Profil",
    appearance: isEn ? "Appearance" : "Apparence",
    notifications: "Notifications",
    platform: isEn ? "Platform" : "Plateforme",
    security: isEn ? "Security" : "Sécurité",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t.settings.title}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isEn ? "Manage your account and platform settings" : "Gérez votre compte et les paramètres de la plateforme"}
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <nav className="hidden sm:block w-48 shrink-0 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
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
        <div className="sm:hidden flex gap-1 overflow-x-auto pb-2 mb-4 w-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
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
        <div className="flex-1 w-full max-w-2xl">
          {/* ─── Profile ─────────────────────────────────────────── */}
          {activeTab === "profile" && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground">
                {isEn ? "Admin Profile" : "Profil administrateur"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isEn ? "Your personal information" : "Vos informations personnelles"}
              </p>
              <Separator className="my-4" />

              <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-muted text-lg font-semibold dark:text-muted-foreground/70">
                    {(userName || "A").split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{userName || "Admin"}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="dark:text-muted-foreground/70">{isEn ? "Full Name" : "Nom complet"}</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="dark:bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-muted-foreground/70">{isEn ? "Email" : "Email"}</Label>
                  <Input value={user?.email || ""} disabled className="opacity-60" />
                  <p className="text-xs text-muted-foreground/70">{isEn ? "Email cannot be changed" : "L'email ne peut pas être modifié"}</p>
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

          {/* ─── Appearance ───────────────────────────────────────── */}
          {activeTab === "appearance" && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground">
                {isEn ? "Appearance" : "Apparence"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isEn ? "Customize the look and feel" : "Personnalisez l'apparence"}
              </p>
              <Separator className="my-4" />

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {darkMode ? <Moon className="h-5 w-5 text-muted-foreground/70" /> : <Sun className="h-5 w-5 text-amber-500" />}
                    <div>
                      <Label className="dark:text-muted-foreground/70">{isEn ? "Dark Mode" : "Mode sombre"}</Label>
                      <p className="text-sm text-muted-foreground">
                        {isEn ? "Switch between light and dark theme" : "Basculer entre le thème clair et sombre"}
                      </p>
                    </div>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
                </div>

                <Separator className="dark:bg-muted" />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="dark:text-muted-foreground/70">{isEn ? "Language" : "Langue"}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isEn ? "Choose your preferred language" : "Choisissez votre langue préférée"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLanguage("fr")}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                        language === "fr"
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground dark:text-muted-foreground/70"
                      )}
                    >
                      🇫🇷 Français
                    </button>
                    <button
                      onClick={() => setLanguage("en")}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                        language === "en"
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground dark:text-muted-foreground/70"
                      )}
                    >
                      🇬🇧 English
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ─── Notifications ────────────────────────────────────── */}
          {/* These tabs (Notifications, Platform, Security) previously
              rendered fully-styled forms with Switches and Inputs that
              had NO onChange/onClick handlers — admins clicked Save and
              saw "saved" feedback while nothing persisted. Worse than
              no UI. Until each surface is wired to a real backing
              store (notification_preferences for admin, app_config
              RPC for platform, /dashboard/settings for password rotation
              with current-password reauth), render an honest placeholder. */}
          {activeTab === "notifications" && (
            <Card className="p-6 text-center">
              <h3 className="text-lg font-semibold text-foreground">
                {isEn ? "Admin notifications — coming soon" : "Notifications admin — bientôt disponible"}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {isEn
                  ? "Per-event admin notification preferences will live here. For now, all admin alerts go to the address set in ADMIN_ALERT_EMAIL."
                  : "Les préférences de notification admin par événement arriveront ici. Pour l'instant, toutes les alertes admin vont à l'adresse définie dans ADMIN_ALERT_EMAIL."}
              </p>
            </Card>
          )}

          {/* ─── Platform ─────────────────────────────────────────── */}
          {activeTab === "platform" && (
            <Card className="p-6 text-center">
              <h3 className="text-lg font-semibold text-foreground">
                {isEn ? "Platform settings — read-only" : "Paramètres plateforme — lecture seule"}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {isEn
                  ? "Platform name, checkout URL, and subscription price live in environment variables and the lib/licence constants. Edit them in the Vercel dashboard or the codebase, then redeploy."
                  : "Le nom de la plateforme, l'URL de paiement et le prix de l'abonnement sont définis dans les variables d'environnement et lib/licence. Modifiez-les dans Vercel ou le code, puis redéployez."}
              </p>
            </Card>
          )}

          {/* ─── Security ─────────────────────────────────────────── */}
          {activeTab === "security" && (
            <Card className="p-6 text-center">
              <h3 className="text-lg font-semibold text-foreground">
                {isEn ? "Change password" : "Changer le mot de passe"}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {isEn
                  ? "Use the password change form on your personal settings page — it requires re-authentication with your current password and sends a confirmation email."
                  : "Utilisez le formulaire de changement de mot de passe sur votre page de paramètres personnels — il requiert une ré-authentification et envoie un email de confirmation."}
              </p>
              <Button className="mt-4" render={<Link href="/dashboard/settings?tab=security" />}>
                {isEn ? "Open security settings" : "Ouvrir les paramètres de sécurité"}
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

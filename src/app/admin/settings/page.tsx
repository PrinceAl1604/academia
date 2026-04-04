"use client";

import { useState, useEffect } from "react";
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
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          {t.settings.title}
        </h1>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
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
        <div className="flex-1 w-full max-w-2xl">
          {/* ─── Profile ─────────────────────────────────────────── */}
          {activeTab === "profile" && (
            <Card className="p-6 dark:bg-neutral-900 dark:border-neutral-800">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                {isEn ? "Admin Profile" : "Profil administrateur"}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {isEn ? "Your personal information" : "Vos informations personnelles"}
              </p>
              <Separator className="my-4 dark:bg-neutral-800" />

              <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-neutral-200 dark:bg-neutral-700 text-lg font-semibold dark:text-neutral-300">
                    {(userName || "A").split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">{userName || "Admin"}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="dark:text-neutral-300">{isEn ? "Full Name" : "Nom complet"}</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="dark:bg-neutral-800 dark:border-neutral-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-neutral-300">{isEn ? "Email" : "Email"}</Label>
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

          {/* ─── Appearance ───────────────────────────────────────── */}
          {activeTab === "appearance" && (
            <Card className="p-6 dark:bg-neutral-900 dark:border-neutral-800">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                {isEn ? "Appearance" : "Apparence"}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {isEn ? "Customize the look and feel" : "Personnalisez l'apparence"}
              </p>
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

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="dark:text-neutral-300">{isEn ? "Language" : "Langue"}</Label>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {isEn ? "Choose your preferred language" : "Choisissez votre langue préférée"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLanguage("fr")}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
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
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
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

          {/* ─── Notifications ────────────────────────────────────── */}
          {activeTab === "notifications" && (
            <Card className="p-6 dark:bg-neutral-900 dark:border-neutral-800">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Notifications
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {isEn ? "Manage your notification preferences" : "Gérez vos préférences de notification"}
              </p>
              <Separator className="my-4 dark:bg-neutral-800" />

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="dark:text-neutral-300">{isEn ? "New Student Signup" : "Nouvel étudiant inscrit"}</Label>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {isEn ? "Get notified when a new student signs up" : "Soyez notifié quand un nouvel étudiant s'inscrit"}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="dark:text-neutral-300">{isEn ? "New Pro Subscription" : "Nouvel abonnement Pro"}</Label>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {isEn ? "Get notified when a student activates Pro" : "Soyez notifié quand un étudiant active Pro"}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="dark:text-neutral-300">{isEn ? "Course Completion" : "Cours terminé"}</Label>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {isEn ? "Get notified when a student completes a course" : "Soyez notifié quand un étudiant termine un cours"}
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="dark:text-neutral-300">{isEn ? "Weekly Report" : "Rapport hebdomadaire"}</Label>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {isEn ? "Receive a weekly summary of platform activity" : "Recevez un résumé hebdomadaire de l'activité"}
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </Card>
          )}

          {/* ─── Platform ─────────────────────────────────────────── */}
          {activeTab === "platform" && (
            <Card className="p-6 dark:bg-neutral-900 dark:border-neutral-800">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                {isEn ? "Platform Settings" : "Paramètres de la plateforme"}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {isEn ? "Configure your platform" : "Configurez votre plateforme"}
              </p>
              <Separator className="my-4 dark:bg-neutral-800" />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="dark:text-neutral-300">{isEn ? "Platform Name" : "Nom de la plateforme"}</Label>
                  <Input defaultValue="Brightroots" className="dark:bg-neutral-800 dark:border-neutral-700" />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-neutral-300">{isEn ? "Platform URL" : "URL de la plateforme"}</Label>
                  <Input defaultValue="https://academia-vert-phi.vercel.app" disabled className="opacity-60 dark:bg-neutral-800 dark:border-neutral-700" />
                </div>

                <Separator className="dark:bg-neutral-800" />

                <div className="space-y-2">
                  <Label className="dark:text-neutral-300">{isEn ? "Chariow Checkout URL" : "URL de paiement Chariow"}</Label>
                  <Input defaultValue="https://jwxfcqrf.mychariow.shop/prd_o6clpf/checkout" disabled className="opacity-60 dark:bg-neutral-800 dark:border-neutral-700" />
                  <p className="text-xs text-neutral-400">{isEn ? "Configured in environment variables" : "Configuré dans les variables d'environnement"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-neutral-300">{isEn ? "Subscription Price" : "Prix de l'abonnement"}</Label>
                  <Input defaultValue="15,000 FCFA / month (~$27 USD)" disabled className="opacity-60 dark:bg-neutral-800 dark:border-neutral-700" />
                </div>

                <Separator className="dark:bg-neutral-800" />

                <div className="space-y-2">
                  <Label className="dark:text-neutral-300">{isEn ? "Email Service" : "Service email"}</Label>
                  <Input defaultValue="Resend" disabled className="opacity-60 dark:bg-neutral-800 dark:border-neutral-700" />
                  <p className="text-xs text-neutral-400">{isEn ? "Configure custom domain in Resend dashboard" : "Configurez un domaine dans le dashboard Resend"}</p>
                </div>
              </div>
            </Card>
          )}

          {/* ─── Security ─────────────────────────────────────────── */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <Card className="p-6 dark:bg-neutral-900 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-neutral-500" />
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {isEn ? "Change Password" : "Changer le mot de passe"}
                  </h3>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {isEn ? "Update your password to keep your account secure" : "Mettez à jour votre mot de passe"}
                </p>
                <Separator className="my-4 dark:bg-neutral-800" />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="dark:text-neutral-300">{isEn ? "New Password" : "Nouveau mot de passe"}</Label>
                    <Input type="password" placeholder="••••••••" className="dark:bg-neutral-800 dark:border-neutral-700" />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-neutral-300">{isEn ? "Confirm Password" : "Confirmer le mot de passe"}</Label>
                    <Input type="password" placeholder="••••••••" className="dark:bg-neutral-800 dark:border-neutral-700" />
                  </div>
                  <Button>{isEn ? "Update Password" : "Mettre à jour"}</Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

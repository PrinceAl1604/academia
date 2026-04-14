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
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
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
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
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
                  <Label>{isEn ? "Full Name" : "Nom complet"}</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isEn ? "Email" : "Email"}</Label>
                  <Input value={user?.email || ""} disabled className="opacity-60" />
                  <p className="text-xs text-muted-foreground/70">{isEn ? "Email cannot be changed" : "L'email ne peut pas être modifié"}</p>
                </div>

                <div className="flex items-center gap-3 justify-end pt-2">
                  {saved && (
                    <span className="flex items-center gap-1 text-sm text-primary">
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
                    {darkMode ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-amber-500" />}
                    <div>
                      <Label>{isEn ? "Dark Mode" : "Mode sombre"}</Label>
                      <p className="text-sm text-muted-foreground">
                        {isEn ? "Switch between light and dark theme" : "Basculer entre le thème clair et sombre"}
                      </p>
                    </div>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{isEn ? "Language" : "Langue"}</Label>
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
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      🇫🇷 Français
                    </button>
                    <button
                      onClick={() => setLanguage("en")}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                        language === "en"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
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
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground">
                Notifications
              </h3>
              <p className="text-sm text-muted-foreground">
                {isEn ? "Manage your notification preferences" : "Gérez vos préférences de notification"}
              </p>
              <Separator className="my-4" />

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{isEn ? "New Student Signup" : "Nouvel étudiant inscrit"}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isEn ? "Get notified when a new student signs up" : "Soyez notifié quand un nouvel étudiant s'inscrit"}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{isEn ? "New Pro Subscription" : "Nouvel abonnement Pro"}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isEn ? "Get notified when a student activates Pro" : "Soyez notifié quand un étudiant active Pro"}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{isEn ? "Course Completion" : "Cours terminé"}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isEn ? "Get notified when a student completes a course" : "Soyez notifié quand un étudiant termine un cours"}
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{isEn ? "Weekly Report" : "Rapport hebdomadaire"}</Label>
                    <p className="text-sm text-muted-foreground">
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
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground">
                {isEn ? "Platform Settings" : "Paramètres de la plateforme"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isEn ? "Configure your platform" : "Configurez votre plateforme"}
              </p>
              <Separator className="my-4" />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{isEn ? "Platform Name" : "Nom de la plateforme"}</Label>
                  <Input defaultValue="Brightroots" />
                </div>
                <div className="space-y-2">
                  <Label>{isEn ? "Platform URL" : "URL de la plateforme"}</Label>
                  <Input defaultValue="https://academia-vert-phi.vercel.app" disabled className="opacity-60" />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>{isEn ? "Chariow Checkout URL" : "URL de paiement Chariow"}</Label>
                  <Input defaultValue="https://jwxfcqrf.mychariow.shop/prd_o6clpf/checkout" disabled className="opacity-60" />
                  <p className="text-xs text-muted-foreground/70">{isEn ? "Configured in environment variables" : "Configuré dans les variables d'environnement"}</p>
                </div>
                <div className="space-y-2">
                  <Label>{isEn ? "Subscription Price" : "Prix de l'abonnement"}</Label>
                  <Input defaultValue="15,000 FCFA / month (~$27 USD)" disabled className="opacity-60" />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>{isEn ? "Email Service" : "Service email"}</Label>
                  <Input defaultValue="Resend" disabled className="opacity-60" />
                  <p className="text-xs text-muted-foreground/70">{isEn ? "Configure custom domain in Resend dashboard" : "Configurez un domaine dans le dashboard Resend"}</p>
                </div>
              </div>
            </Card>
          )}

          {/* ─── Security ─────────────────────────────────────────── */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold text-foreground">
                    {isEn ? "Change Password" : "Changer le mot de passe"}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {isEn ? "Update your password to keep your account secure" : "Mettez à jour votre mot de passe"}
                </p>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{isEn ? "New Password" : "Nouveau mot de passe"}</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                  <div className="space-y-2">
                    <Label>{isEn ? "Confirm Password" : "Confirmer le mot de passe"}</Label>
                    <Input type="password" placeholder="••••••••" />
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

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Loader2, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const { user, userName } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState(userName || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    // Update Supabase users table
    await supabase.from("users").update({ name }).eq("id", user.id);

    // Update auth metadata
    await supabase.auth.updateUser({ data: { full_name: name } });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t.profile.title}</h1>
        <p className="mt-1 text-neutral-500">{t.profile.subtitle}</p>
      </div>

      {/* Avatar */}
      <Card className="p-6">
        <div className="flex items-center gap-6">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-neutral-200 text-xl font-semibold">
              {(userName || "U").split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-neutral-900">{userName || "User"}</h3>
            <p className="text-sm text-neutral-500">{user?.email}</p>
          </div>
        </div>
      </Card>

      {/* Personal info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-neutral-900">{t.profile.personalInfo}</h3>
        <Separator className="my-4" />

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.auth.fullName}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t.auth.email}</Label>
            <Input id="email" type="email" value={user?.email || ""} disabled className="opacity-60" />
            <p className="text-xs text-neutral-400">
              {t.nav.signIn === "Sign In" ? "Email cannot be changed" : "L'email ne peut pas être modifié"}
            </p>
          </div>
          <div className="flex items-center gap-3 justify-end">
            {saved && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <Check className="h-4 w-4" />
                {t.nav.signIn === "Sign In" ? "Saved" : "Enregistré"}
              </span>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t.profile.saveChanges}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

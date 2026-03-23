"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Check, Loader2, Globe, Key, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function AdminSettingsPage() {
  const { user, userName } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
        <p className="mt-1 text-neutral-500">Platform configuration</p>
      </div>

      {/* Admin Profile */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="font-semibold text-neutral-900">Admin Profile</h3>
          <Separator />
          <div className="space-y-2">
            <Label>Name</Label>
            <Input defaultValue={userName || ""} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input defaultValue={user?.email || ""} disabled className="opacity-60" />
          </div>
        </CardContent>
      </Card>

      {/* Platform Settings */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-neutral-500" />
            <h3 className="font-semibold text-neutral-900">Platform</h3>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Platform Name</Label>
            <Input defaultValue="Educator" />
          </div>
          <div className="space-y-2">
            <Label>Platform URL</Label>
            <Input defaultValue="https://academia-vert-phi.vercel.app" disabled className="opacity-60" />
          </div>
        </CardContent>
      </Card>

      {/* Payment Settings */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-neutral-500" />
            <h3 className="font-semibold text-neutral-900">Payment (Chariow)</h3>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Chariow Product URL</Label>
            <Input defaultValue="https://jwxfcqrf.mychariow.shop/prd_o6clpf" disabled className="opacity-60" />
            <p className="text-xs text-neutral-400">Configured in environment variables</p>
          </div>
          <div className="space-y-2">
            <Label>Price</Label>
            <Input defaultValue="15,000 FCFA / month" disabled className="opacity-60" />
          </div>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-neutral-500" />
            <h3 className="font-semibold text-neutral-900">Email (Resend)</h3>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>From Email</Label>
            <Input defaultValue="noreply@resend.dev" disabled className="opacity-60" />
            <p className="text-xs text-neutral-400">Configure custom domain in Resend dashboard</p>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3 justify-end">
        {saved && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

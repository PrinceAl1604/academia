"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";
import { FullLogo } from "@/components/shared/full-logo";
import { LanguageToggle } from "@/components/shared/language-toggle";

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/sign-in`,
    });

    if (error) { setError(error.message); } else { setSent(true); }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex items-center justify-between p-4 sm:p-8">
        <Link href="/sign-in" className="inline-block">
          <FullLogo className="h-7" />
        </Link>
        <LanguageToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-20">
        <div className="w-full max-w-sm space-y-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t.auth.resetTitle}</h1>
          <p className="text-muted-foreground">{t.auth.resetDesc}</p>

          {sent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-muted-foreground">{t.auth.checkEmailReset}</p>
              <Link href="/sign-in" className="inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
                {t.auth.backToSignIn}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-foreground/80">{t.auth.email}</Label>
                <Input id="email" type="email" placeholder={t.auth.emailPlaceholder}
                  className="h-12 rounded-xl border-border bg-card text-base placeholder:text-muted-foreground/70"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="h-12 w-full rounded-xl bg-primary text-base font-medium text-primary-foreground hover:bg-primary/90"
                disabled={loading || !email}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t.auth.sendResetLink}
              </Button>
              <div className="text-center">
                <Link href="/sign-in" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
                  {t.auth.backToSignIn}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";
import { FullLogo } from "@/components/shared/full-logo";
import { LanguageToggle } from "@/components/shared/language-toggle";

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const refCode = searchParams.get("ref") || "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) return;

    if (password.length < 6) {
      setError(t.auth.passwordMinError);
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          ...(refCode ? { referral_code: refCode.toUpperCase() } : {}),
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      fetch("/api/email/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      }).catch(() => {});
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen flex-col bg-[#faf9f7]">
        <div className="p-4 sm:p-8">
          <Link href="/sign-in" className="inline-block">
            <FullLogo className="h-7" />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12 sm:pb-20">
          <div className="w-full max-w-sm space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{t.auth.checkEmail}</h1>
            <p className="text-muted-foreground">
              {t.auth.confirmationSent} <strong>{email}</strong>.
            </p>
            <Link href="/sign-in" className="mt-4 inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
              {t.auth.backToSignIn}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#faf9f7]">
      <div className="flex items-center justify-between p-4 sm:p-8">
        <Link href="/sign-in" className="inline-block">
          <FullLogo className="h-7" />
        </Link>
        <LanguageToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-12 sm:pb-20">
        <div className="w-full max-w-sm space-y-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t.auth.signUp}</h1>

          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm text-foreground/90">{t.auth.fullName}</Label>
              <Input
                id="name" type="text" placeholder={t.auth.fullNamePlaceholder}
                className="h-12 rounded-lg border-input bg-card text-base placeholder:text-muted-foreground/70"
                value={name} onChange={(e) => setName(e.target.value)} required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-foreground/90">{t.auth.email}</Label>
              <Input
                id="email" type="email" placeholder={t.auth.emailPlaceholder}
                className="h-12 rounded-lg border-input bg-card text-base placeholder:text-muted-foreground/70"
                value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-foreground/90">{t.auth.password}</Label>
              <div className="relative">
                <Input
                  id="password" type={showPassword ? "text" : "password"} placeholder={t.auth.createPassword}
                  className="h-12 rounded-lg border-input bg-card pr-12 text-base placeholder:text-muted-foreground/70"
                  value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground/70">{t.auth.minChars}</p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="h-12 w-full rounded-lg bg-muted text-base font-medium text-white hover:bg-muted/80"
              disabled={loading || !email || !password || !name}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t.auth.createAccount}
            </Button>
          </form>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {t.auth.alreadyAccount}
          <Link href="/sign-in" className="rounded-md border border-input bg-card px-3 py-2 text-sm font-medium text-foreground/90 hover:bg-muted/40">
            {t.auth.signInButton}
          </Link>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground/90 py-1">{t.auth.privacy}</Link>
          <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground/90 py-1">{t.auth.terms}</Link>
        </div>
      </div>
    </div>
  );
}

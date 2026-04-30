"use client";

import { Suspense, useState } from "react";
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

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      const explicit = searchParams.get("redirect");
      if (explicit) {
        router.push(explicit);
      } else {
        // Send admins to /admin, students to home
        const role = data.user?.user_metadata?.role;
        router.push(role === "admin" ? "/admin" : "/");
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Logo + Language Toggle */}
      <div className="flex items-center justify-between p-4 sm:p-8">
        <Link href="/sign-in" className="inline-block">
          <FullLogo className="h-7" />
        </Link>
        <LanguageToggle />
      </div>

      {/* Sign In Form */}
      <div className="flex flex-1 items-center justify-center px-4 pb-12 sm:pb-20">
        <div className="w-full max-w-sm space-y-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t.auth.signIn}</h1>

          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-foreground/90">
                {t.auth.email}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t.auth.emailPlaceholder}
                className="h-12 rounded-lg border-input bg-card text-base placeholder:text-muted-foreground/70"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-foreground/90">
                {t.auth.password}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t.auth.passwordPlaceholder}
                  className="h-12 rounded-lg border-input bg-card pr-12 text-base placeholder:text-muted-foreground/70"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              type="submit"
              className="h-12 w-full rounded-lg text-base font-medium"
              disabled={loading || !email || !password}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t.auth.continueEmail}
            </Button>
          </form>

          <div className="text-center">
            <Link href="/reset-password" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
              {t.auth.resetPassword}
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {t.auth.noAccount}
          <Link href="/sign-up" className="rounded-md border border-input bg-card px-3 py-2 text-sm font-medium text-foreground/90 hover:bg-muted/40">
            {t.auth.signUpButton}
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

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
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

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#faf9f7]">
      <div className="p-8">
        <Link href="/sign-in" className="inline-block">
          <img src="/logo-wordmark.svg" alt="Educator" className="h-6" />
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-20">
        <div className="w-full max-w-sm space-y-6">
          <h1 className="text-3xl font-bold text-neutral-900">Reset password</h1>
          <p className="text-neutral-600">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>

          {sent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-neutral-600">
                Check your email for a password reset link.
              </p>
              <Link
                href="/sign-in"
                className="inline-block text-sm text-neutral-600 underline underline-offset-4 hover:text-neutral-900"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-neutral-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address..."
                  className="h-12 rounded-lg border-neutral-300 bg-white text-base placeholder:text-neutral-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button
                type="submit"
                className="h-12 w-full rounded-lg bg-neutral-800 text-base font-medium text-white hover:bg-neutral-700"
                disabled={loading || !email}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send reset link"}
              </Button>

              <div className="text-center">
                <Link
                  href="/sign-in"
                  className="text-sm text-neutral-600 underline underline-offset-4 hover:text-neutral-900"
                >
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

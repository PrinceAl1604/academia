"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SignInPage() {
  const router = useRouter();
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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#faf9f7]">
      {/* Logo */}
      <div className="p-8">
        <Link href="/sign-in" className="inline-block">
          <img src="/logo.svg" alt="Academia" className="h-6" />
        </Link>
      </div>

      {/* Sign In Form */}
      <div className="flex flex-1 items-center justify-center px-4 pb-20">
        <div className="w-full max-w-sm space-y-6">
          <h1 className="text-3xl font-bold text-neutral-900">Sign in</h1>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-4">
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
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-neutral-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password..."
                  className="h-12 rounded-lg border-neutral-300 bg-white pr-12 text-base placeholder:text-neutral-400"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <Button
              type="submit"
              className="h-12 w-full rounded-lg bg-neutral-800 text-base font-medium text-white hover:bg-neutral-700"
              disabled={loading || !email || !password}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Continue with email"
              )}
            </Button>
          </form>

          {/* Reset Password */}
          <div className="text-center">
            <Link
              href="/reset-password"
              className="text-sm text-neutral-600 underline underline-offset-4 hover:text-neutral-900"
            >
              Reset password
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-neutral-200 px-8 py-4">
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          No account?
          <Link
            href="/sign-up"
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Sign up
          </Link>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="text-sm text-neutral-500 hover:text-neutral-700"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-sm text-neutral-500 hover:text-neutral-700"
          >
            Terms
          </Link>
        </div>
      </div>
    </div>
  );
}

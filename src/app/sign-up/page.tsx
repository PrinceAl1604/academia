"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) return;

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
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
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen flex-col bg-[#faf9f7]">
        <div className="p-8">
          <Link href="/sign-in" className="inline-block">
            <span className="text-xl font-bold tracking-tight text-neutral-900">
              Academia
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-20">
          <div className="w-full max-w-sm space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">Check your email</h1>
            <p className="text-neutral-600">
              We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.
            </p>
            <Link
              href="/sign-in"
              className="mt-4 inline-block text-sm text-neutral-600 underline underline-offset-4 hover:text-neutral-900"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#faf9f7]">
      {/* Logo */}
      <div className="p-8">
        <Link href="/sign-in" className="inline-block">
          <span className="text-xl font-bold tracking-tight text-neutral-900">
            Academia
          </span>
        </Link>
      </div>

      {/* Sign Up Form */}
      <div className="flex flex-1 items-center justify-center px-4 pb-20">
        <div className="w-full max-w-sm space-y-6">
          <h1 className="text-3xl font-bold text-neutral-900">Create account</h1>

          {/* Google Button */}
          <Button
            variant="outline"
            className="h-12 w-full gap-3 rounded-lg border-neutral-300 bg-white text-base font-normal text-neutral-700 hover:bg-neutral-50"
            onClick={handleGoogleSignUp}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-[#faf9f7] px-4 text-neutral-500">or</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm text-neutral-700">
                Full name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name..."
                className="h-12 rounded-lg border-neutral-300 bg-white text-base placeholder:text-neutral-400"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

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
                  placeholder="Create a password..."
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
              <p className="text-xs text-neutral-400">Minimum 6 characters</p>
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <Button
              type="submit"
              className="h-12 w-full rounded-lg bg-neutral-800 text-base font-medium text-white hover:bg-neutral-700"
              disabled={loading || !email || !password || !name}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Create account"
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-neutral-200 px-8 py-4">
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          Already have an account?
          <Link
            href="/sign-in"
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Sign in
          </Link>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="text-sm text-neutral-500 hover:text-neutral-700">
            Privacy
          </Link>
          <Link href="/terms" className="text-sm text-neutral-500 hover:text-neutral-700">
            Terms
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { getCategories, type CategoryRow } from "@/lib/api";
import {
  GraduationCap,
  Briefcase,
  Rocket,
  BookOpen,
  Lightbulb,
  MoreHorizontal,
  Sun,
  Moon,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Gift,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Illustration } from "@/components/shared/illustration";

/* ─── Types ────────────────────────────────────────────────── */
interface OnboardingData {
  name: string;
  language: "en" | "fr";
  theme: "light" | "dark";
  userType: string;
  interests: string[];
  referralCode: string;
}

const USER_TYPES = [
  { id: "student", icon: GraduationCap },
  { id: "professional", icon: Briefcase },
  { id: "entrepreneur", icon: Rocket },
  { id: "teacher", icon: BookOpen },
  { id: "self-learner", icon: Lightbulb },
  { id: "other", icon: MoreHorizontal },
];

const USER_TYPE_LABELS: Record<string, Record<string, string>> = {
  student:       { en: "Student",       fr: "Étudiant" },
  professional:  { en: "Professional",  fr: "Professionnel" },
  entrepreneur:  { en: "Entrepreneur",  fr: "Entrepreneur" },
  teacher:       { en: "Teacher",       fr: "Enseignant" },
  "self-learner":{ en: "Self-learner",  fr: "Autodidacte" },
  other:         { en: "Other",         fr: "Autre" },
};

/* ─── Main Component ───────────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter();
  const { user, userName, markOnboarded } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  const [data, setData] = useState<OnboardingData>({
    name: userName || "",
    language: (language as "en" | "fr") || "en",
    theme: "light",
    userType: "",
    interests: [],
    referralCode: "",
  });
  const [referralStatus, setReferralStatus] = useState<"idle" | "applied" | "invalid" | "already">("idle");

  const totalSteps = 5;

  // Sync name from auth
  useEffect(() => {
    if (userName && !data.name) setData((d) => ({ ...d, name: userName }));
  }, [userName]);

  // Load categories for step 3
  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  // Detect current theme
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) setData((d) => ({ ...d, theme: "dark" }));
  }, []);

  /* ─── Handlers ─────────────────────────────────────────── */
  const setTheme = (theme: "light" | "dark") => {
    setData((d) => ({ ...d, theme }));
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  };

  const toggleInterest = (id: string) => {
    setData((d) => ({
      ...d,
      interests: d.interests.includes(id)
        ? d.interests.filter((i) => i !== id)
        : [...d.interests, id],
    }));
  };

  const submitReferralCode = async () => {
    if (!data.referralCode || referralStatus === "applied") return;
    try {
      const res = await fetch("/api/referral/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: data.referralCode }),
      });
      if (res.ok) {
        setReferralStatus("applied");
      } else if (res.status === 409) {
        setReferralStatus("already");
      } else {
        setReferralStatus("invalid");
      }
    } catch {
      setReferralStatus("invalid");
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);

    // Update language context
    setLanguage(data.language);

    // Save to Supabase
    await supabase
      .from("users")
      .update({
        name: data.name || undefined,
        has_onboarded: true,
        user_type: data.userType || null,
        interests: data.interests.length > 0 ? data.interests : null,
        theme_preference: data.theme,
      })
      .eq("id", user.id);

    // Update context immediately so SidebarLayout doesn't redirect back
    markOnboarded();

    // Signal the Pro upsell overlay to show on the homepage
    localStorage.setItem("just_onboarded", "true");

    router.push("/");
  };

  const canProceed = () => {
    if (step === 0) return true; // name is optional
    if (step === 1) return !!data.userType;
    if (step === 2) return true; // interests are optional
    if (step === 3) return true; // referral is optional
    return true;
  };

  /* ─── Render ───────────────────────────────────────────── */
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      {/* Skip button — top right */}
      {step > 0 && step < totalSteps - 1 && (
        <button
          onClick={() => setStep(step + 1)}
          className="absolute top-6 right-6 text-sm font-medium text-muted-foreground/70 hover:text-foreground/90 transition-colors"
        >
          {t.onboarding.skip}
        </button>
      )}

      <div className="w-full max-w-xl">

        {/* Step content with fade transition */}
        <div key={step} className="animate-in fade-in duration-300">

          {/* ─── Step 1: Personalize ─────────────────────── */}
          {step === 0 && (
            <div className="space-y-8">
              {/* Hero illustration — sets the tone for the flow.
                  md size (240px) matches the interests-step illustration
                  for visual rhythm across the bookended onboarding steps;
                  larger sizes were dominating the viewport above the form. */}
              <div className="flex justify-center">
                <Illustration name="welcome-onboarding" alt="" size="md" priority />
              </div>
              <div>
                <h1 className="text-3xl font-medium tracking-tight text-foreground">
                  {t.onboarding.personalizeTitle}
                </h1>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/90">
                  {t.onboarding.whatsYourName}{" "}
                  <span className="text-muted-foreground/70 font-normal">({t.onboarding.optional})</span>
                </label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  placeholder={t.onboarding.yourName}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-input dark:focus:border-border transition-colors"
                />
              </div>

              {/* Language */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/90">
                  {t.onboarding.preferredLanguage}
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setData({ ...data, language: "en" }); setLanguage("en"); }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                      data.language === "en"
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-border"
                    )}
                  >
                    English
                  </button>
                  <button
                    onClick={() => { setData({ ...data, language: "fr" }); setLanguage("fr"); }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                      data.language === "fr"
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-border"
                    )}
                  >
                    Français
                  </button>
                </div>
              </div>

              {/* Theme */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/90">
                  {t.onboarding.chooseTheme}
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setTheme("light")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                      data.theme === "light"
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-border"
                    )}
                  >
                    <Sun className="h-4 w-4" />
                    {t.onboarding.light}
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                      data.theme === "dark"
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-border"
                    )}
                  >
                    <Moon className="h-4 w-4" />
                    {t.onboarding.dark}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 2: Who are you? ────────────────────── */}
          {step === 1 && (
            <div className="space-y-8">
              <h1 className="text-3xl font-bold text-foreground">
                {t.onboarding.whichDescribes}
              </h1>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {USER_TYPES.map(({ id, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setData({ ...data, userType: id })}
                    className={cn(
                      "flex flex-col items-center gap-3 rounded-2xl border p-5 transition-all",
                      data.userType === id
                        ? "border-foreground bg-muted/40 ring-1 ring-foreground"
                        : "border-border hover:border-border hover:bg-muted/40 dark:hover:bg-card"
                    )}
                  >
                    <Icon className="h-6 w-6 text-foreground/90" />
                    <span className="text-sm font-medium text-foreground">
                      {USER_TYPE_LABELS[id]?.[data.language] || id}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── Step 3: Interests ───────────────────────── */}
          {step === 2 && (
            <div className="space-y-8">
              <div className="flex justify-center">
                <Illustration name="interests" alt="" size="md" priority />
              </div>
              <div>
                <h1 className="text-3xl font-medium tracking-tight text-foreground">
                  {t.onboarding.topicsInterest}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t.onboarding.selectAll}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.map((cat) => {
                  const selected = data.interests.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleInterest(cat.id)}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-2xl border p-4 transition-all text-left",
                        selected
                          ? "border-foreground bg-muted/40 ring-1 ring-foreground"
                          : "border-border hover:border-border hover:bg-muted/40 dark:hover:bg-card"
                      )}
                    >
                      {selected && (
                        <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground">
                          <Check className="h-3 w-3 text-background" />
                        </div>
                      )}
                      <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-foreground">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Step 4: Referral Code ──────────────────── */}
          {step === 3 && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {t.onboarding.referralTitle}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t.onboarding.referralSubtitle}
                </p>
              </div>

              <div className="mx-auto max-w-sm space-y-4">
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
                    <Gift className="h-8 w-8 text-amber-600" />
                  </div>
                </div>

                {/* Code input */}
                <div className="space-y-2">
                  <input
                    type="text"
                    value={data.referralCode}
                    onChange={(e) => {
                      setData({ ...data, referralCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") });
                      setReferralStatus("idle");
                    }}
                    placeholder={t.onboarding.referralPlaceholder}
                    maxLength={8}
                    disabled={referralStatus === "applied"}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3.5 text-center font-mono text-lg tracking-[0.2em] outline-none transition-colors placeholder:text-muted-foreground/70 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm",
                      referralStatus === "applied"
                        ? "border-green-300 dark:border-green-700 bg-primary/10 text-primary"
                        : referralStatus === "invalid"
                          ? "border-red-300 dark:border-red-700 bg-card text-foreground"
                          : "border-border bg-card text-foreground focus:border-input dark:focus:border-border"
                    )}
                  />

                  {/* Status messages */}
                  {referralStatus === "applied" && (
                    <p className="flex items-center justify-center gap-1.5 text-sm text-primary">
                      <CheckCircle className="h-4 w-4" />
                      {t.onboarding.referralApplied}
                    </p>
                  )}
                  {referralStatus === "invalid" && (
                    <p className="flex items-center justify-center gap-1.5 text-sm text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      {t.onboarding.referralInvalid}
                    </p>
                  )}
                  {referralStatus === "already" && (
                    <p className="flex items-center justify-center gap-1.5 text-sm text-amber-600">
                      <CheckCircle className="h-4 w-4" />
                      {t.onboarding.referralAlready}
                    </p>
                  )}
                </div>

                {/* Apply button */}
                {referralStatus !== "applied" && referralStatus !== "already" && (
                  <button
                    onClick={submitReferralCode}
                    disabled={!data.referralCode || data.referralCode.length < 4}
                    className="w-full rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {data.language === "fr" ? "Appliquer" : "Apply"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── Step 5: All Set ─────────────────────────── */}
          {step === 4 && (
            <div className="space-y-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Sparkles className="h-10 w-10 text-foreground/90" />
              </div>

              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {t.onboarding.allSet}
                </h1>
                <p className="mt-2 text-muted-foreground">
                  {t.onboarding.welcomeStart}{data.name ? `, ${data.name}` : ""}{t.onboarding.welcomeEnd}
                </p>
              </div>

              {/* Summary */}
              <div className="mx-auto max-w-sm rounded-2xl border border-border p-5 text-left space-y-3">
                {data.userType && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t.onboarding.profileLabel}</span>
                    <span className="font-medium text-foreground">
                      {USER_TYPE_LABELS[data.userType]?.[data.language] || data.userType}
                    </span>
                  </div>
                )}
                {data.interests.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t.onboarding.interests}</span>
                    <span className="font-medium text-foreground">
                      {data.interests.length} {t.onboarding.topics}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.onboarding.languageLabel}</span>
                  <span className="font-medium text-foreground">
                    {data.language === "en" ? "English" : "Français"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.onboarding.themeLabel}</span>
                  <span className="font-medium text-foreground">
                    {data.theme === "light" ? t.onboarding.light : t.onboarding.dark}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Navigation Bar ──────────────────────────────── */}
        <div className="mt-12 flex items-center justify-between">
          {/* Back */}
          <div>
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t.onboarding.back}
              </button>
            )}
          </div>

          {/* Progress dots */}
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === step ? "w-6 bg-foreground" : "w-2 bg-muted"
                )}
              />
            ))}
          </div>

          {/* Next / Finish */}
          {step < totalSteps - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t.onboarding.next}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving
                ? t.onboarding.saving
                : t.onboarding.startExploring}
              {!saving && <ArrowRight className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

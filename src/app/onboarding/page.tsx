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
} from "lucide-react";

/* ─── Types ────────────────────────────────────────────────── */
interface OnboardingData {
  name: string;
  language: "en" | "fr";
  theme: "light" | "dark";
  userType: string;
  interests: string[];
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
  });

  const totalSteps = 4;

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
    return true;
  };

  /* ─── Render ───────────────────────────────────────────── */
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-white dark:bg-neutral-950 px-4 py-12">
      {/* Skip button — top right */}
      {step > 0 && step < totalSteps - 1 && (
        <button
          onClick={() => setStep(step + 1)}
          className="absolute top-6 right-6 text-sm font-medium text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
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
              <div>
                <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
                  {t.onboarding.personalizeTitle}
                </h1>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t.onboarding.whatsYourName}{" "}
                  <span className="text-neutral-400 font-normal">({t.onboarding.optional})</span>
                </label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  placeholder={t.onboarding.yourName}
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
                />
              </div>

              {/* Language */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t.onboarding.preferredLanguage}
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setData({ ...data, language: "en" }); setLanguage("en"); }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                      data.language === "en"
                        ? "border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                        : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700"
                    )}
                  >
                    English
                  </button>
                  <button
                    onClick={() => { setData({ ...data, language: "fr" }); setLanguage("fr"); }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                      data.language === "fr"
                        ? "border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                        : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700"
                    )}
                  >
                    Français
                  </button>
                </div>
              </div>

              {/* Theme */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t.onboarding.chooseTheme}
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setTheme("light")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                      data.theme === "light"
                        ? "border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                        : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700"
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
                        ? "border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                        : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700"
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
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
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
                        ? "border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800 ring-1 ring-neutral-900 dark:ring-white"
                        : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    )}
                  >
                    <Icon className="h-6 w-6 text-neutral-700 dark:text-neutral-300" />
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
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
              <div>
                <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
                  {t.onboarding.topicsInterest}
                </h1>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
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
                          ? "border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800 ring-1 ring-neutral-900 dark:ring-white"
                          : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      )}
                    >
                      {selected && (
                        <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 dark:bg-white">
                          <Check className="h-3 w-3 text-white dark:text-neutral-900" />
                        </div>
                      )}
                      <BookOpen className="h-4 w-4 text-neutral-500 dark:text-neutral-400 shrink-0" />
                      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Step 4: All Set ─────────────────────────── */}
          {step === 3 && (
            <div className="space-y-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                <Sparkles className="h-10 w-10 text-neutral-700 dark:text-neutral-300" />
              </div>

              <div>
                <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
                  {t.onboarding.allSet}
                </h1>
                <p className="mt-2 text-neutral-500 dark:text-neutral-400">
                  {t.onboarding.welcomeStart}{data.name ? `, ${data.name}` : ""}{t.onboarding.welcomeEnd}
                </p>
              </div>

              {/* Summary */}
              <div className="mx-auto max-w-sm rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 text-left space-y-3">
                {data.userType && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">{t.onboarding.profileLabel}</span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {USER_TYPE_LABELS[data.userType]?.[data.language] || data.userType}
                    </span>
                  </div>
                )}
                {data.interests.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">{t.onboarding.interests}</span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {data.interests.length} {t.onboarding.topics}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">{t.onboarding.languageLabel}</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">
                    {data.language === "en" ? "English" : "Français"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">{t.onboarding.themeLabel}</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">
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
                className="text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
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
                  i === step ? "w-6 bg-neutral-900 dark:bg-white" : "w-2 bg-neutral-200 dark:bg-neutral-700"
                )}
              />
            ))}
          </div>

          {/* Next / Finish */}
          {step < totalSteps - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 rounded-xl bg-neutral-900 dark:bg-white px-5 py-2.5 text-sm font-medium text-white dark:text-neutral-900 transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t.onboarding.next}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-neutral-900 dark:bg-white px-5 py-2.5 text-sm font-medium text-white dark:text-neutral-900 transition-opacity hover:opacity-90 disabled:opacity-60"
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

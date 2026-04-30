"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  HelpCircle,
  Mail,
  MessageSquare,
  Search,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { Illustration } from "@/components/shared/illustration";

/**
 * Help page — refreshed hero with help-support illustration.
 *
 * Same hero pattern as the rest of the app: mono "/ Section" preheader
 * + tight headline. Illustration tucks into the hero on sm+ (similar
 * treatment to /dashboard/subscription) — small enough to not compete
 * with the search bar, present enough to set the support-page tone.
 */
export default function HelpPage() {
  const { t } = useLanguage();

  const faqItems = [
    { question: t.help.faqQ1, answer: t.help.faqA1 },
    { question: t.help.faqQ2, answer: t.help.faqA2 },
    { question: t.help.faqQ3, answer: t.help.faqA3 },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 sm:px-0 py-8">
      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          / Help
        </p>
        <div className="flex items-end justify-between gap-6">
          <div className="space-y-2 flex-1">
            <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
              {t.help.title}
            </h1>
            <p className="text-muted-foreground text-base max-w-prose">
              {t.help.subtitle}
            </p>
          </div>
          <div className="hidden sm:block shrink-0">
            <Illustration name="help-support" alt="" size="md" priority />
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
        <Input placeholder={t.help.searchPlaceholder} className="h-11 pl-9" />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="cursor-pointer p-5 transition-colors hover:bg-muted/40">
          <BookOpen className="h-6 w-6 text-foreground/90" />
          <h3 className="mt-3 font-semibold text-foreground">
            {t.help.documentation}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{t.help.browseGuides}</p>
        </Card>
        <Card className="cursor-pointer p-5 transition-colors hover:bg-muted/40">
          <MessageSquare className="h-6 w-6 text-foreground/90" />
          <h3 className="mt-3 font-semibold text-foreground">{t.help.liveChat}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t.help.chatSupport}</p>
        </Card>
        <Card className="cursor-pointer p-5 transition-colors hover:bg-muted/40">
          <Mail className="h-6 w-6 text-foreground/90" />
          <h3 className="mt-3 font-semibold text-foreground">{t.help.emailUs}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            support@brightroots.com
          </p>
        </Card>
      </div>

      {/* FAQ */}
      <Card className="p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <HelpCircle className="h-5 w-5" />
          {t.help.faq}
        </h3>
        <div className="mt-4 space-y-4">
          {faqItems.map((item) => (
            <div key={item.question} className="rounded-lg bg-muted/40 p-4">
              <h4 className="font-medium text-foreground">
                {item.question}
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {t.help.cantFind}
        </p>
        <Button variant="outline" className="mt-2">
          {t.subscription.contactSupport}
        </Button>
      </div>
    </div>
  );
}

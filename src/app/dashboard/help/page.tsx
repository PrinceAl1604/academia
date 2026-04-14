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

export default function HelpPage() {
  const { t } = useLanguage();

  const faqItems = [
    { question: t.help.faqQ1, answer: t.help.faqA1 },
    { question: t.help.faqQ2, answer: t.help.faqA2 },
    { question: t.help.faqQ3, answer: t.help.faqA3 },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t.help.title}</h1>
        <p className="mt-1 text-muted-foreground">
          {t.help.subtitle}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
        <Input placeholder={t.help.searchPlaceholder} className="h-11 pl-9" />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="cursor-pointer p-5 transition-colors hover:border-primary/30 hover:bg-muted/40">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100/70 dark:bg-blue-900/30 ring-1 ring-blue-200/60 dark:ring-blue-700/40">
            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="mt-3 font-semibold text-foreground">
            {t.help.documentation}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{t.help.browseGuides}</p>
        </Card>
        <Card className="cursor-pointer p-5 transition-colors hover:border-primary/30 hover:bg-muted/40">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <h3 className="mt-3 font-semibold text-foreground">{t.help.liveChat}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t.help.chatSupport}</p>
        </Card>
        <Card className="cursor-pointer p-5 transition-colors hover:border-primary/30 hover:bg-muted/40">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100/70 dark:bg-amber-900/30 ring-1 ring-amber-200/60 dark:ring-amber-700/40">
            <Mail className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="mt-3 font-semibold text-foreground">{t.help.emailUs}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            support@brightroots.com
          </p>
        </Card>
      </div>

      {/* FAQ */}
      <Card className="p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
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

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

const faqItems = [
  {
    question: "How do I activate my licence key?",
    answer: "Go to the Sign In page and enter your licence key to access the platform.",
  },
  {
    question: "Can I download courses for offline viewing?",
    answer: "Yes, Pro plan subscribers can download course content for offline access.",
  },
  {
    question: "What if my licence key expires?",
    answer: "Contact our support team to renew your licence. You won't lose your progress.",
  },
];

export default function HelpPage() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t.help.title}</h1>
        <p className="mt-1 text-neutral-500">
          {t.help.subtitle}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input placeholder={t.help.searchPlaceholder} className="h-11 pl-9" />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="cursor-pointer p-5 transition-colors hover:bg-neutral-50">
          <BookOpen className="h-6 w-6 text-neutral-700" />
          <h3 className="mt-3 font-semibold text-neutral-900">
            {t.help.documentation}
          </h3>
          <p className="mt-1 text-sm text-neutral-500">{t.help.browseGuides}</p>
        </Card>
        <Card className="cursor-pointer p-5 transition-colors hover:bg-neutral-50">
          <MessageSquare className="h-6 w-6 text-neutral-700" />
          <h3 className="mt-3 font-semibold text-neutral-900">{t.help.liveChat}</h3>
          <p className="mt-1 text-sm text-neutral-500">{t.help.chatSupport}</p>
        </Card>
        <Card className="cursor-pointer p-5 transition-colors hover:bg-neutral-50">
          <Mail className="h-6 w-6 text-neutral-700" />
          <h3 className="mt-3 font-semibold text-neutral-900">{t.help.emailUs}</h3>
          <p className="mt-1 text-sm text-neutral-500">
            support@academia.com
          </p>
        </Card>
      </div>

      {/* FAQ */}
      <Card className="p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
          <HelpCircle className="h-5 w-5" />
          Frequently Asked Questions
        </h3>
        <div className="mt-4 space-y-4">
          {faqItems.map((item) => (
            <div key={item.question} className="rounded-lg bg-neutral-50 p-4">
              <h4 className="font-medium text-neutral-900">
                {item.question}
              </h4>
              <p className="mt-1 text-sm text-neutral-500">{item.answer}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="text-center">
        <p className="text-sm text-neutral-500">
          {t.help.cantFind}
        </p>
        <Button variant="outline" className="mt-2">
          {t.subscription.contactSupport}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggle = () => {
    setLanguage(language === "en" ? "fr" : "en");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-muted-foreground hover:text-foreground"
      onClick={toggle}
      aria-label={language === "en" ? "Switch to French" : "Switch to English"}
    >
      <Globe className="h-4 w-4" />
      <span className="text-xs font-semibold uppercase">
        {language === "en" ? "FR" : "EN"}
      </span>
    </Button>
  );
}

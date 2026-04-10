"use client";

import { type ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Lock, Crown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";
import {
  SUBSCRIPTION_PRICE,
  SUBSCRIPTION_CURRENCY_DISPLAY,
} from "@/lib/licence";

interface MembershipPopoverProps {
  children: ReactNode;
}

export function MembershipPopover({ children }: MembershipPopoverProps) {
  const { t } = useLanguage();

  return (
    <Popover>
      <PopoverTrigger
        render={
          <div
            className="cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        }
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        side="top"
        align="center"
        sideOffset={8}
      >
        <div className="space-y-3 p-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
              <Crown className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">
                {t.pro.membership}
              </p>
              <p className="text-xs text-neutral-500">
                {t.pro.unlockAll}
              </p>
            </div>
          </div>

          {/* Price */}
          <p className="text-lg font-bold text-neutral-900">
            {SUBSCRIPTION_PRICE.toLocaleString("fr-FR")} <span className="text-sm font-normal text-neutral-500">{SUBSCRIPTION_CURRENCY_DISPLAY} {t.subscription.perMonth}</span>
          </p>

          {/* Benefits */}
          <ul className="space-y-1.5 text-xs text-neutral-600">
            <li className="flex items-center gap-2">
              <Lock className="h-3 w-3 text-neutral-400" />
              {t.pro.accessCourses}
            </li>
            <li className="flex items-center gap-2">
              <Lock className="h-3 w-3 text-neutral-400" />
              {t.pro.downloadResources}
            </li>
          </ul>

          {/* CTA */}
          <Button
            className="h-9 w-full gap-2 text-sm"
            render={<Link href="/dashboard/subscription" />}
          >
            <Crown className="h-3.5 w-3.5" />
            {t.pro.getKey}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

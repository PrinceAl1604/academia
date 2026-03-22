"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, ArrowRight, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";

export function LicenceModal() {
  const { showLicenceModal, activate, dismissModal } = useAuth();
  const { t } = useLanguage();
  const [licenceKey, setLicenceKey] = useState("");
  const [error, setError] = useState(false);

  const handleActivate = () => {
    const success = activate(licenceKey);
    if (!success) {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  if (!showLicenceModal) return null;

  return (
    <Dialog open={showLicenceModal} onOpenChange={(open) => !open && dismissModal()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <button
          onClick={dismissModal}
          className="absolute right-4 top-4 rounded-sm p-1 text-neutral-400 opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>

        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
            <Key className="h-6 w-6 text-neutral-700" />
          </div>
          <DialogTitle className="text-center text-xl">
            {t.signInPage.title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t.signInPage.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="modal-licence">{t.subscription.licenceKey}</Label>
            <Input
              id="modal-licence"
              placeholder={t.signInPage.placeholder}
              className={`h-12 text-center font-mono text-lg tracking-widest ${
                error ? "border-red-500 ring-1 ring-red-500" : ""
              }`}
              maxLength={19}
              value={licenceKey}
              onChange={(e) => {
                setLicenceKey(e.target.value);
                setError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleActivate()}
            />
            {error && (
              <p className="text-xs text-red-500">
                Please enter a valid licence key
              </p>
            )}
            <p className="text-xs text-neutral-400">
              {t.signInPage.format}
            </p>
          </div>

          <Button
            className="h-12 w-full gap-2 text-base"
            onClick={handleActivate}
          >
            {t.signInPage.activate}
            <ArrowRight className="h-4 w-4" />
          </Button>

          <button
            onClick={dismissModal}
            className="w-full text-center text-sm text-neutral-500 hover:text-neutral-700"
          >
            {t.signInPage.noKey} — Browse free courses
          </button>
        </div>

        <div className="mt-2 rounded-lg bg-neutral-50 p-3">
          <div className="flex gap-2">
            <ShieldCheck className="h-4 w-4 flex-shrink-0 text-green-600 mt-0.5" />
            <p className="text-xs text-neutral-500">
              {t.signInPage.secureDesc}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

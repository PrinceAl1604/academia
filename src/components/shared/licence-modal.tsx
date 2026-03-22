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
import { Key, ArrowRight, ShieldCheck, X, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function LicenceModal() {
  const { showLicenceModal, activateLicenceKey, dismissModal } = useAuth();
  const [licenceKey, setLicenceKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    const result = await activateLicenceKey(licenceKey);

    if (!result.success) {
      setError(result.error || "Invalid licence key");
    }
    setLoading(false);
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
            Activate Pro Plan
          </DialogTitle>
          <DialogDescription className="text-center">
            Enter your licence key to unlock all courses and features.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="modal-licence">Licence Key</Label>
            <Input
              id="modal-licence"
              placeholder="ACAD-XXXX-XXXX-XXXX"
              className={`h-12 text-center font-mono text-lg tracking-widest ${
                error ? "border-red-500 ring-1 ring-red-500" : ""
              }`}
              value={licenceKey}
              onChange={(e) => {
                setLicenceKey(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleActivate()}
              disabled={loading}
            />
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
          </div>

          <Button
            className="h-12 w-full gap-2 text-base"
            onClick={handleActivate}
            disabled={loading || !licenceKey.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                Activate
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <button
            onClick={dismissModal}
            className="w-full text-center text-sm text-neutral-500 hover:text-neutral-700"
          >
            Cancel
          </button>
        </div>

        <div className="mt-2 rounded-lg bg-neutral-50 p-3">
          <div className="flex gap-2">
            <ShieldCheck className="h-4 w-4 flex-shrink-0 text-green-600 mt-0.5" />
            <p className="text-xs text-neutral-500">
              Your licence key provides full access to all courses. Keep it safe
              and don&apos;t share it with others.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

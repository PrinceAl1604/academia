"use client";

import { useState, type ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, KeyRound, Loader2, CheckCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface UpgradePopoverProps {
  children: ReactNode;
  locked: boolean;
}

export function UpgradePopover({ children, locked }: UpgradePopoverProps) {
  const { activateLicenceKey } = useAuth();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!locked) return <>{children}</>;

  const handleActivate = async () => {
    if (!key.trim() || loading) return;
    setLoading(true);
    setError(null);

    const result = await activateLicenceKey(key);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setKey("");
      }, 1200);
    } else {
      setError(result.error || "Invalid key");
    }
    setLoading(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <div
            className="cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(true);
            }}
          />
        }
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        side="top"
        align="center"
        sideOffset={8}
      >
        {success ? (
          <div className="flex flex-col items-center gap-2 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-sm font-medium text-neutral-900">
              Pro Plan Activated!
            </p>
            <p className="text-xs text-neutral-500">
              All courses are now unlocked.
            </p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
                <Lock className="h-4 w-4 text-neutral-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  Pro content
                </p>
                <p className="text-xs text-neutral-500">
                  Enter your licence key to unlock
                </p>
              </div>
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                <Input
                  placeholder="ACAD-XXXX-XXXX-XXXX"
                  className={`h-9 pl-9 font-mono text-xs tracking-wider ${
                    error ? "border-red-400" : ""
                  }`}
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleActivate()}
                  autoFocus
                />
              </div>
              <Button
                size="sm"
                className="h-9 px-3"
                onClick={handleActivate}
                disabled={loading || !key.trim()}
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            {/* Footer */}
            <p className="text-[11px] text-neutral-400">
              Don&apos;t have a key?{" "}
              <a
                href="/dashboard/subscription"
                className="text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
              >
                Get one here
              </a>
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

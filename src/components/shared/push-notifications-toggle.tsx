"use client";

import { useState, useEffect, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, BellRing, AlertCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

/**
 * Push-notification subscribe/unsubscribe toggle. Lives in
 * /dashboard/settings notifications tab.
 *
 * Flow:
 *   1. On mount, check current SW subscription state (if granted) +
 *      browser support
 *   2. User flips the switch ON → request permission → subscribe via
 *      Service Worker → POST endpoint to /api/push/subscribe
 *   3. User flips OFF → unsubscribe locally + DELETE on server
 *
 * Renders nothing if the browser doesn't support push (Safari
 * pre-iOS 16.4, some embedded webviews) — no point teasing a feature
 * the platform can't deliver.
 */

const SW_PATH = "/sw.js";

/**
 * Decode a URL-safe base64 VAPID key into a fresh ArrayBuffer that
 * the push subscribe API will accept. Returns a freshly-allocated
 * ArrayBuffer (NOT a view onto the Uint8Array's buffer) so the type
 * matches BufferSource exactly under strict TS — recent TS versions
 * type Uint8Array as Uint8Array<ArrayBufferLike> which doesn't
 * narrow cleanly to ArrayBuffer.
 */
function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

export function PushNotificationsToggle() {
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ─── Detect support + current subscription state ───────── */
  useEffect(() => {
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setSupported(false);
        setLoading(false);
        return;
      }
      setSupported(true);
      try {
        const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          setSubscribed(!!sub);
        }
      } catch {
        // ignore — supported but state unreadable
      }
      setLoading(false);
    })();
  }, []);

  const subscribe = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublic) {
        throw new Error("Push isn't fully configured. Contact support.");
      }
      // Request permission first — user gesture required for the
      // permission prompt in most browsers.
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setError(
          isEn
            ? "Permission denied. Enable in your browser settings to receive push."
            : "Permission refusée. Activez-la dans les paramètres du navigateur."
        );
        setBusy(false);
        return;
      }
      // Register the service worker (idempotent — ok to call repeatedly)
      const reg = await navigator.serviceWorker.register(SW_PATH);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(vapidPublic),
      });
      const subJson = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          user_agent: navigator.userAgent,
        }),
      });
      if (!res.ok) throw new Error("Server failed to register subscription");
      setSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setBusy(false);
  }, [isEn]);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const subJson = sub.toJSON() as { endpoint?: string };
          await sub.unsubscribe();
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subJson.endpoint }),
          });
        }
      }
      setSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setBusy(false);
  }, []);

  if (loading) return null;

  if (!supported) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/30 p-3 flex items-start gap-2.5">
        <AlertCircle className="h-4 w-4 text-muted-foreground/70 mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          {isEn
            ? "This browser doesn't support push notifications. Try Chrome, Firefox, Edge, or Safari 16.4+."
            : "Ce navigateur ne prend pas en charge les notifications push. Essayez Chrome, Firefox, Edge ou Safari 16.4+."}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 p-4 space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <BellRing
            className={
              subscribed ? "h-4 w-4 text-primary" : "h-4 w-4 text-muted-foreground"
            }
          />
          <div className="min-w-0">
            <Label className="text-sm font-medium text-foreground">
              {isEn ? "Push notifications" : "Notifications push"}
            </Label>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {isEn
                ? "Get system-level notifications even when the tab is closed."
                : "Recevez des notifications système même quand l'onglet est fermé."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {busy && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/70" />
          )}
          <Switch
            checked={subscribed}
            disabled={busy}
            onCheckedChange={(next) => (next ? subscribe() : unsubscribe())}
          />
        </div>
      </div>
      {error && (
        <p className="text-xs text-destructive pl-6">{error}</p>
      )}
    </div>
  );
}

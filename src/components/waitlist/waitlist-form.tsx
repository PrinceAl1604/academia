"use client";

import { useState } from "react";
import { ArrowRight, Loader2, CheckCircle2, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Waitlist capture form — prénom + WhatsApp (+ optional email). Low friction by
 * design: no qualifying questions (that happens later, at the paid workshop
 * signup). On success it shows the confirmation + a WhatsApp join button.
 */
export function WaitlistForm({ whatsappUrl }: { whatsappUrl: string | null }) {
  const [firstName, setFirstName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const name = firstName.trim();
    const phone = whatsapp.replace(/[^\d+]/g, "");
    if (name.length < 2) {
      setError("Indique ton prénom.");
      return;
    }
    if (!/^\+?\d{7,15}$/.test(phone)) {
      setError("Numéro WhatsApp invalide (avec l'indicatif, ex. +229…).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: name,
          whatsapp: phone,
          email: email.trim() || undefined,
          source: "liste",
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          d?.error === "rate_limited"
            ? "Trop de tentatives — réessaie dans un moment."
            : "Une erreur est survenue. Réessaie."
        );
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-3 text-lg font-semibold text-foreground">Tu es sur la liste 🎉</p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Surveille ton WhatsApp : ton cadeau arrive, et tu seras le premier prévenu
          pour le workshop.
        </p>
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" />
            Rejoindre le WhatsApp maintenant
          </a>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 text-left">
      <div>
        <label htmlFor="wl-name" className="mb-1 block text-xs font-medium text-muted-foreground">
          Prénom
        </label>
        <Input
          id="wl-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Ton prénom"
          autoComplete="given-name"
          className="h-11"
        />
      </div>
      <div>
        <label htmlFor="wl-wa" className="mb-1 block text-xs font-medium text-muted-foreground">
          Numéro WhatsApp
        </label>
        <Input
          id="wl-wa"
          type="tel"
          inputMode="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="+229 00 00 00 00"
          autoComplete="tel"
          className="h-11"
        />
      </div>
      <div>
        <label htmlFor="wl-email" className="mb-1 block text-xs font-medium text-muted-foreground">
          Email <span className="text-muted-foreground/60">(optionnel)</span>
        </label>
        <Input
          id="wl-email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ton@email.com"
          autoComplete="email"
          className="h-11"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" disabled={loading} className="h-12 w-full gap-2 text-sm">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Je rejoins la liste <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
      <p className="text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        Gratuit · sans engagement · prix fondateur verrouillé
      </p>
    </form>
  );
}

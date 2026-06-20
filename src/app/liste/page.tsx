import type { Metadata } from "next";
import { Gift, Crown, CalendarClock } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";

/**
 * VISIBLE waitlist — top-of-funnel capture page.
 *
 * The widest net: captures people who interact with the content but aren't yet
 * ready to book the workshop, and routes them into WhatsApp. Low friction
 * (prénom + WhatsApp), clear value + founder price. French-first (the audience
 * is francophone creatives). A subdomain will be pointed here later.
 */

export const metadata: Metadata = {
  title: "Liste d'attente — VISIBLE",
  description:
    "Rejoins la liste d'attente VISIBLE : prix fondateur verrouillé, cadeau immédiat (le mini Brand Blueprint) et invitation prioritaire au workshop.",
};

// Regenerate at most hourly — keeps the page fast/static while still picking up
// a changed WhatsApp link within the hour.
export const revalidate = 3600;

async function getWhatsappUrl(): Promise<string | null> {
  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("communities")
      .select("whatsapp_url")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return (data?.whatsapp_url as string | null) ?? null;
  } catch {
    return null;
  }
}

const PERKS = [
  {
    icon: Crown,
    title: "Accès prioritaire + prix fondateur",
    body: "Ton tarif fondateur est verrouillé dès l'ouverture de VISIBLE.",
  },
  {
    icon: Gift,
    title: "Un cadeau immédiat",
    body: "Le mini Brand Blueprint — un avant-goût du livrable du workshop.",
  },
  {
    icon: CalendarClock,
    title: "Invitation prioritaire au workshop",
    body: "Place à tarif réduit au prochain workshop, avant tout le monde.",
  },
];

export default async function ListePage() {
  const whatsappUrl = await getWhatsappUrl();

  return (
    <div data-landing className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-center px-5 py-6">
        <Logo className="h-6" />
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-5 pt-8 pb-16 sm:pt-14 sm:pb-20">
        <div className="mx-auto max-w-xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            VISIBLE arrive.
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            Rejoins la liste d&apos;attente.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            Sois le premier informé, verrouille le prix fondateur, et reçois ton
            invitation au workshop.
          </p>

          <p className="mx-auto mt-7 max-w-md text-xl font-medium tracking-tight text-foreground sm:text-2xl">
            « Le talent ne paie pas. <em className="text-primary">La marque, si.</em> »
          </p>

          <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-border bg-card p-5 shadow-sm">
            <WaitlistForm whatsappUrl={whatsappUrl} formId="wl-hero" />
          </div>
        </div>
      </section>

      {/* ── The 3 things you get ─────────────────────────────── */}
      <section className="border-y border-border bg-muted/30 px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Ce que tu obtiens
          </p>
          <h2 className="mt-3 text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            3 raisons de rejoindre
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {PERKS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="rounded-2xl border border-border bg-card p-5 text-center"
                >
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold tracking-tight">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── The immediate gift ───────────────────────────────── */}
      <section className="px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl border border-primary/30 bg-primary/5 p-8 text-center sm:p-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Gift className="h-6 w-6" />
            </div>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
              Cadeau immédiat
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Le mini Brand Blueprint
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              Un avant-goût concret du livrable du workshop : la trame pour transformer ton
              talent en une marque qui se vend. Reçu sur WhatsApp dès ton inscription.
            </p>
          </div>
        </div>
      </section>

      {/* ── Who it's for ─────────────────────────────────────── */}
      <section className="px-5 pb-2">
        <p className="mx-auto max-w-xl text-center text-sm text-muted-foreground">
          Pour les{" "}
          <span className="text-foreground">créatifs francophones doués mais invisibles</span>{" "}
          — ceux dont le travail mérite d&apos;être payé à sa juste valeur.
        </p>
      </section>

      {/* ── Repeated CTA ─────────────────────────────────────── */}
      <section className="px-5 py-16 text-center sm:py-20">
        <div className="mx-auto max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Verrouille ta place.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-base text-muted-foreground">
            VISIBLE est un programme premium. La liste d&apos;attente est gratuite — et c&apos;est
            là que les places fondateur partent en premier.
          </p>
          <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-border bg-card p-5 shadow-sm">
            <WaitlistForm whatsappUrl={whatsappUrl} formId="wl-cta" />
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border px-5 py-10 text-center">
        <Logo className="mx-auto h-5 opacity-70" />
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          © {new Date().getFullYear()} VISIBLE
        </p>
      </footer>
    </div>
  );
}

import type { Metadata } from "next";
import { Gift, Crown, CalendarClock, Sparkles } from "lucide-react";
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

/** Hero backdrop: faint dot grid + a green glow at the top (matches landing). */
function Backdrop() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,_oklch(var(--muted-foreground)/0.16)_1px,_transparent_1px)] [background-size:24px_24px] opacity-50"
      />
      <div
        aria-hidden
        className="animate-glow-pulse pointer-events-none absolute inset-x-0 -top-32 h-[520px] [background:radial-gradient(ellipse_60%_50%_at_50%_0%,_oklch(var(--primary)/0.16)_0%,_transparent_70%)]"
      />
    </>
  );
}

/** Concentric brand seal with curved text (decorative watermark). */
function BrandSeal({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 360 360"
      fill="none"
      stroke="currentColor"
      className={`pointer-events-none select-none ${className ?? ""}`}
    >
      <defs>
        <path id="wl-seal-t" d="M 23,180 A 157,157 0 0 1 337,180" />
        <path id="wl-seal-b" d="M 47,180 A 133,133 0 0 0 313,180" />
      </defs>
      <circle cx="180" cy="180" r="177" strokeWidth="1" />
      <circle cx="180" cy="180" r="143" strokeWidth="1" />
      <circle cx="180" cy="180" r="104" strokeWidth="1" />
      <circle
        cx="180"
        cy="180"
        r="120"
        strokeWidth="2.5"
        strokeDasharray="0.5 7"
        strokeLinecap="round"
      />
      <g fill="currentColor" stroke="none" style={{ fontFamily: "var(--font-sans)", fontWeight: 500 }}>
        <text style={{ fontSize: "13px", letterSpacing: "0.26em" }}>
          <textPath href="#wl-seal-t" startOffset="50%" textAnchor="middle">
            VISIBLE • LISTE D&apos;ATTENTE
          </textPath>
        </text>
        <text style={{ fontSize: "12px", letterSpacing: "0.22em" }}>
          <textPath href="#wl-seal-b" startOffset="50%" textAnchor="middle">
            LE TALENT NE PAIE PAS • LA MARQUE SI
          </textPath>
        </text>
      </g>
      <polygon
        fill="currentColor"
        stroke="none"
        points="78.81 42.68 125.88 195.76 159.64 195.76 112.56 42.68"
        transform="translate(94.3 94.2) scale(0.72)"
      />
    </svg>
  );
}

/** A small visual mock of the "mini Brand Blueprint" gift (CSS only). */
function BlueprintMock() {
  return (
    <div className="relative mx-auto w-full max-w-[260px]">
      <div
        aria-hidden
        className="absolute -inset-3 -z-10 rounded-3xl bg-primary/10 blur-2xl"
      />
      <div className="rotate-[-3deg] rounded-2xl border border-border bg-card p-5 shadow-2xl shadow-black/10">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary/70" />
          <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-muted-foreground">
            Brand Blueprint
          </span>
        </div>
        <div className="mt-4 h-2.5 w-2/3 rounded bg-foreground/80" />
        <div className="mt-2.5 h-1.5 w-full rounded bg-muted" />
        <div className="mt-1.5 h-1.5 w-5/6 rounded bg-muted" />
        <div className="mt-4 grid grid-cols-3 gap-1.5">
          <div className="h-9 rounded bg-primary/15" />
          <div className="h-9 rounded bg-muted" />
          <div className="h-9 rounded bg-muted" />
        </div>
        <div className="mt-3 h-1.5 w-full rounded bg-muted" />
        <div className="mt-1.5 h-1.5 w-4/5 rounded bg-muted" />
        <div className="mt-1.5 h-1.5 w-2/3 rounded bg-muted" />
      </div>
    </div>
  );
}

export default async function ListePage() {
  const whatsappUrl = await getWhatsappUrl();

  return (
    <div data-landing className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-center px-5 py-6">
        <Logo className="h-6" />
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-5 pt-8 pb-20 sm:pt-14 sm:pb-28">
        <Backdrop />
        <BrandSeal className="absolute -right-24 -top-12 w-[340px] text-foreground/[0.05] sm:-right-12 sm:w-[460px]" />
        <div className="relative mx-auto max-w-xl text-center duration-700 animate-in fade-in-0 slide-in-from-bottom-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3 w-3" />
            Prix fondateur · places limitées
          </span>
          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            VISIBLE arrive.
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-[1.03] tracking-tight sm:text-5xl lg:text-6xl">
            Rejoins la <span className="text-primary">liste d&apos;attente.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            Sois le premier informé, verrouille le prix fondateur, et reçois ton
            invitation au workshop.
          </p>

          <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-border bg-card/80 p-5 shadow-xl shadow-black/5 backdrop-blur-sm">
            <WaitlistForm whatsappUrl={whatsappUrl} formId="wl-hero" />
          </div>
        </div>
      </section>

      {/* ── Core idea (dark band) ────────────────────────────── */}
      <section className="border-y border-border bg-foreground px-5 py-16 text-background sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-background/50">
            L&apos;idée
          </p>
          <p className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Le talent ne paie pas. <em className="text-primary">La marque, si.</em>
          </p>
        </div>
      </section>

      {/* ── The 3 things you get ─────────────────────────────── */}
      <section className="px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Ce que tu obtiens
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              3 raisons de rejoindre
            </h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {PERKS.map((p, i) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="group relative rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
                >
                  <span className="absolute right-4 top-4 font-mono text-xs tabular-nums text-muted-foreground/40">
                    0{i + 1}
                  </span>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-base font-semibold tracking-tight">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── The immediate gift (with visual) ─────────────────── */}
      <section className="border-y border-border bg-muted/30 px-5 py-16 sm:py-24">
        <div className="mx-auto grid max-w-4xl items-center gap-10 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
              Cadeau immédiat
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Le mini Brand Blueprint
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              Un avant-goût concret du livrable du workshop : la trame pour transformer ton
              talent en une marque qui se vend. Reçu sur WhatsApp dès ton inscription.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Gift className="h-3.5 w-3.5" />
              Offert en rejoignant la liste
            </p>
          </div>
          <BlueprintMock />
        </div>
      </section>

      {/* ── Who it's for ─────────────────────────────────────── */}
      <section className="px-5 py-14 text-center">
        <p className="mx-auto max-w-xl text-base text-muted-foreground sm:text-lg">
          Pour les{" "}
          <span className="font-medium text-foreground">
            créatifs francophones doués mais invisibles
          </span>{" "}
          — ceux dont le travail mérite d&apos;être payé à sa juste valeur.
        </p>
      </section>

      {/* ── Repeated CTA ─────────────────────────────────────── */}
      <section className="relative overflow-hidden px-5 py-16 text-center sm:py-24">
        <Backdrop />
        <div className="relative mx-auto max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Verrouille ta place.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-base text-muted-foreground">
            VISIBLE est un programme premium. La liste d&apos;attente est gratuite — et c&apos;est
            là que les places fondateur partent en premier.
          </p>
          <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-border bg-card/80 p-5 shadow-xl shadow-black/5 backdrop-blur-sm">
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

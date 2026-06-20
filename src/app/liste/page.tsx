import type { Metadata } from "next";
import Image from "next/image";
import { Gift, Sparkles, ArrowRight } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";

/**
 * VISIBLE waitlist — top-of-funnel capture page.
 *
 * The widest net: captures people who interact with the content but aren't yet
 * ready to book the workshop, and routes them into WhatsApp. Low friction
 * (prénom + WhatsApp), clear value + founder price + proof. French-first.
 * A subdomain will be pointed here later.
 */

export const metadata: Metadata = {
  title: "Liste d'attente — Workshop VISIBLE",
  description:
    "Rejoins la liste d'attente du workshop VISIBLE : sois prévenu en premier, garde ta place à tarif réduit, et reçois le mini Brand Blueprint.",
};

// Regenerate at most hourly — keeps the page fast/static while still picking up
// a changed WhatsApp link within the hour.
export const revalidate = 3600;

// LogoMint client wordmarks (placeholder text — swap for real logo images when
// available). Drives the proof logo cloud.
const CLIENTS = ["lya", "cultiva", "KICKNOVA", "prospera", "ZilkCredible"];
// TODO: real LogoMint portfolio URL.
const LOGOMINT_PORTFOLIO_URL = "#";

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
      <div aria-hidden className="absolute -inset-3 -z-10 rounded-3xl bg-primary/10 blur-2xl" />
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
        <div className="relative mx-auto grid max-w-5xl items-center gap-10 duration-700 animate-in fade-in-0 slide-in-from-bottom-4 lg:grid-cols-2 lg:gap-12">
          {/* Left: copy */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3 w-3" />
              Prochain workshop · places limitées
            </span>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              VISIBLE · Workshop live
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.03] tracking-tight sm:text-5xl lg:text-6xl">
              Rejoins la liste d&apos;attente <span className="text-primary">du workshop.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
              Sois le premier prévenu pour le prochain workshop VISIBLE, garde ta place
              à tarif réduit, et reçois ton mini Brand Blueprint.
            </p>
          </div>

          {/* Right: form */}
          <div className="mx-auto w-full max-w-sm rounded-2xl border border-border bg-card/80 p-5 shadow-xl shadow-black/5 backdrop-blur-sm lg:mx-0 lg:ml-auto">
            <WaitlistForm whatsappUrl={whatsappUrl} formId="wl-hero" />
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
              talent en une marque qui se vend. Reçu par email dès ton inscription.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Gift className="h-3.5 w-3.5" />
              Offert en rejoignant la liste
            </p>
          </div>
          <BlueprintMock />
        </div>
      </section>

      {/* ── Founder — Ton prof ───────────────────────────────── */}
      <section className="px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="grid items-center gap-10 md:grid-cols-[minmax(0,320px)_1fr]">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-xs overflow-hidden rounded-2xl border border-border md:max-w-none">
              <Image
                src="/alex.jpg"
                alt="Alex Landrin, fondateur de LogoMint"
                fill
                sizes="(min-width: 768px) 320px, 20rem"
                quality={70}
                className="object-cover"
              />
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                <span className="opacity-50">/</span> Ton prof
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Alex Landrin.
              </h2>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Designer · Fondateur de LogoMint
              </p>
              <div className="mt-5 space-y-4 text-base leading-relaxed text-muted-foreground">
                <p>
                  Il y a quelques années, je galérais comme la plupart des designers
                  africains : du super travail, zéro client premium. J&apos;avais le talent —
                  pas la visibilité.
                </p>
                <p>
                  Le déclic est venu en arrêtant de me vendre comme « designer freelance » et
                  en construisant <span className="font-medium text-foreground">LogoMint</span>{" "}
                  en mettant mon <em>personal branding</em> en avant — le studio qui attire
                  désormais les marques au lieu de les chasser.
                </p>
                <p>
                  Avec <span className="font-medium text-foreground">VISIBLE</span>, je
                  transmets le système exact que j&apos;ai utilisé. Aucune théorie. Que du
                  terrain.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Samedi · 20h GMT
                </span>
                <span className="rounded-full border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  LogoMint · VISIBLE
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Proof — La preuve (client logo cloud) ────────────── */}
      <section className="border-y border-border bg-muted/30 px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            <span className="opacity-50">/</span> La preuve
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Les témoignages arrivent. <em className="text-primary">La preuve est déjà là.</em>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">VISIBLE</span>, c&apos;est le système
            exact qui a bâti <span className="font-medium text-foreground">LogoMint</span>. Tu
            rejoins la toute première promo — les premiers témoignages, c&apos;est vous qui
            allez les écrire. En attendant, regarde le travail.
          </p>
        </div>

        <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {CLIENTS.map((name) => (
            <span
              key={name}
              className="text-xl font-semibold tracking-tight text-muted-foreground/45 sm:text-2xl"
            >
              {name}
            </span>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href={LOGOMINT_PORTFOLIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Voir tout le portfolio LogoMint
            <ArrowRight className="h-4 w-4" />
          </a>
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

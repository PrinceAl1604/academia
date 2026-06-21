"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  X,
  Target,
  Palette,
  Megaphone,
  Users,
  Inbox,
  Handshake,
  Video,
  Repeat,
  MessageCircle,
  FolderOpen,
  Flame,
  LayoutTemplate,
  FileText,
  Calculator,
  Images,
  CalendarCheck,
  ShieldCheck,
  Unlock,
  Smartphone,
  CreditCard,
  Lock,
  ChevronDown,
  Quote,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Logo } from "@/components/shared/logo";
import { useFadeUp } from "@/lib/hooks/use-fade-up";
import { CountUp } from "@/components/landing/count-up";
import { CHARIOW_PRODUCT_URL } from "@/lib/licence";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════
 *  VISIBLE — Landing du PROGRAMME (l’abonnement)
 *
 *  Page de vente long format (sales letter), mono-page, mobile-first,
 *  100 % français — l’audience est l’Afrique francophone (+ diaspora).
 *  Direction artistique « B » : clair & éditorial, sur la marque
 *  Visible (vert forêt). Tous les CTA pointent vers le checkout Chariow
 *  de l’abonnement (Produit 2). Structure (brief §5) :
 *
 *    1.  Header collant            10. Bonus (value stack)
 *    2.  Hero                      11. Le fondateur (Alex)
 *    3.  Le problème               12. Preuve sociale
 *    4.  L’agitation               13. L’offre + tarif fondateur
 *    5.  La bascule                14. La garantie
 *    6.  Présentation VISIBLE      15. L’urgence
 *    7.  Pour qui / pas pour qui   16. FAQ
 *    8.  Les 6 modules             17. CTA final
 *    9.  Comment ça se passe       18. Footer + barre CTA mobile
 *
 *  Rendu à `/` pour les visiteurs non connectés (les membres voient le
 *  catalogue à la même URL ; page.tsx branche sur l’état d’auth).
 * ═══════════════════════════════════════════════════════════════════ */

/* ─── Lien de paiement ───────────────────────────────────────────────
   Les boutons « Rejoindre VISIBLE » de la page défilent vers la section
   prix (#tarif) — point de conversion unique. Là, le CTA ouvre une modale
   de choix : Chariow (mobile money + carte, FCFA) ou Stripe (carte
   internationale). Liens surchargeables via les variables ci-dessous. */
const PRICING_ANCHOR = "#tarif";

// Checkout Chariow — mobile money + carte, en FCFA (Produit 2 / abonnement).
const CHARIOW_CHECKOUT_URL = `${CHARIOW_PRODUCT_URL}/checkout`;

// [À CONFIGURER] Lien de paiement Stripe (carte internationale). Renseigner
// NEXT_PUBLIC_STRIPE_PAYMENT_URL (ex. https://buy.stripe.com/xxxxxxxx).
const STRIPE_CHECKOUT_URL =
  process.env.NEXT_PUBLIC_STRIPE_PAYMENT_URL ||
  "https://buy.stripe.com/REMPLACER";

const PRICE = "50 000 FCFA";
const PRICE_UNIT = "/mois";

/* ─── Mécanisme d’urgence (brief §5.15) ──────────────────────────────
   Choisir UN mécanisme : un nombre de places fondateur (permanent, sans
   risque d’expiration), OU une date limite (compte à rebours live).
   Par défaut : places — pour ne jamais afficher un minuteur expiré.
   Pour basculer en date, mettre FOUNDER_DEADLINE à une chaîne ISO
   (ex. "2026-07-31T23:59:59") ; la bande affiche alors le compte à
   rebours au lieu du compteur de places. */
const FOUNDER_SEATS = 50; // [À CONFIRMER] nombre de places au tarif fondateur
const FOUNDER_DEADLINE: string | null = null; // ex. "2026-07-31T23:59:59"

// Classes partagées par toutes les sections en fondu-au-scroll.
const FADE_INITIAL = "opacity-0 translate-y-6";
const FADE_VISIBLE = "opacity-100 translate-y-0";
const FADE_TRANSITION = "transition-all duration-700 ease-out";

/* ═══════════════════════════════════════════════════════════════════
 *  Hooks & primitives partagées
 * ═══════════════════════════════════════════════════════════════════ */

/** Vrai dès que la page a défilé au-delà de `threshold` px. */
function useScrolled(threshold: number) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

/**
 * Barre de progression fixée tout en haut du viewport. Largeur mise à
 * jour par mutation directe du style à chaque tick (le state React
 * re-rendrait à chaque pixel — trop coûteux sur une page longue).
 */
function ScrollProgress() {
  const barRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      el.style.width = `${pct}%`;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 bg-transparent"
    >
      <div
        ref={barRef}
        className="h-full bg-primary transition-[width] duration-75 ease-out"
        style={{ width: "0%" }}
      />
    </div>
  );
}

/** Wrapper en fondu-au-scroll (réutilise useFadeUp). */
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const [ref, inView] = useFadeUp<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn(FADE_TRANSITION, inView ? FADE_VISIBLE : FADE_INITIAL, className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** Sur-titre mono majuscules au-dessus de chaque titre de section. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
      <span className="opacity-50">/</span> {children}
    </p>
  );
}

/**
 * Boîte placeholder pour les visuels pas encore fournis (photo d’Alex,
 * témoignages, captures…). Volontairement visible (bordure pointillée +
 * label) pour ne pas partir en prod par accident, et facile à grep :
 * `LabelledPlaceholder`.
 */
function LabelledPlaceholder({
  label,
  aspect = "aspect-[4/3]",
  className,
}: {
  label: string;
  aspect?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40 text-muted-foreground/70",
        aspect,
        className
      )}
    >
      <div className="flex flex-col items-center gap-2 px-6 text-center">
        <Images className="h-6 w-6" />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
    </div>
  );
}

/** Fond hero : grille de points très discrète + halo vert au sommet. */
function HeroBackdrop() {
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

/* ─── CTA & réassurance — réutilisés partout ─────────────────────────── */

/** Bouton CTA principal : mène toujours au checkout Chariow. */
function CtaButton({
  children,
  size = "lg",
  variant,
  className,
}: {
  children: React.ReactNode;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
}) {
  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      render={<a href={PRICING_ANCHOR} />}
    >
      {children}
    </Button>
  );
}

/** Ligne de réassurance paiement, placée sous chaque CTA principal. */
function PayReassurance({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground",
        className
      )}
    >
      <Lock className="h-3.5 w-3.5 text-primary" />
      Paiement sécurisé
      <span className="opacity-40">·</span>
      <Smartphone className="h-3.5 w-3.5" />
      mobile money
      <span className="opacity-40">&amp;</span>
      <CreditCard className="h-3.5 w-3.5" />
      carte
    </p>
  );
}

/**
 * Sélecteur de paiement — ouvert par le CTA de la section prix (#tarif).
 * Deux options présentées en cartes : Chariow (mobile money + carte, en
 * FCFA — recommandé pour l’Afrique francophone) et Stripe (carte bancaire
 * internationale, pour la diaspora). Le déclencheur garde le style passé
 * via `triggerClassName` ; la modale réutilise le Dialog du design system.
 */
function PaymentChooser({
  triggerClassName,
  children,
}: {
  triggerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger className={triggerClassName}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Choisis ton moyen de paiement
          </DialogTitle>
          <DialogDescription>
            Abonnement VISIBLE — {PRICE}
            {PRICE_UNIT}, sans engagement.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 grid gap-3">
          {/* Chariow — recommandé (mobile money local, FCFA) */}
          <a
            href={CHARIOW_CHECKOUT_URL}
            className="group relative flex items-start gap-4 rounded-2xl border border-primary/40 bg-primary/[0.05] p-4 transition-colors hover:border-primary hover:bg-primary/[0.08]"
          >
            <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary-foreground">
              Recommandé
            </span>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Smartphone className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="font-medium text-foreground">Mobile money &amp; carte</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Wave, Orange Money, MTN MoMo ou carte — en FCFA, via Chariow.
              </p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
          </a>
          {/* Stripe — carte bancaire internationale */}
          <a
            href={STRIPE_CHECKOUT_URL}
            className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
              <CreditCard className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="font-medium text-foreground">Carte bancaire</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Visa, Mastercard — paiement international, via Stripe.
              </p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          Paiement 100 % sécurisé · sans engagement · résilie en un clic
        </p>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  Page
 * ═══════════════════════════════════════════════════════════════════ */

export function LandingPage() {
  // Smooth-scroll uniquement tant que la landing est montée (le mettre
  // globalement sur <html> ralentit les sauts d’ancres du dashboard).
  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  return (
    <div
      data-landing
      className="min-h-screen bg-background text-foreground"
    >
      <ScrollProgress />
      <LandingNav />
      <main>
        <Hero />
        <Problem />
        <Agitation />
        <Switch />
        <Solution />
        <FitMatrix />
        <Modules />
        <HowItWorks />
        <Bonuses />
        <Founder />
        {/* Hidden for now — the section only has placeholder testimonials.
            Flip SHOW_SOCIAL_PROOF to true once real founding-member
            testimonials are ready. */}
        {SHOW_SOCIAL_PROOF && <SocialProof />}
        <TheMath />
        <Offer />
        <Guarantee />
        <Urgency />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <StickyMobileCta />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  1. Header collant
 * ═══════════════════════════════════════════════════════════════════ */

function LandingNav() {
  const scrolled = useScrolled(60);
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-out",
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="VISIBLE — accueil" className="flex items-center">
          {/* White logo over the dark hero; normal once the nav solidifies. */}
          <Logo className={cn("h-5", !scrolled && "brightness-0 invert")} />
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/sign-in"
            className={cn(
              "hidden text-sm transition-colors sm:inline-flex",
              scrolled
                ? "text-muted-foreground hover:text-foreground"
                : "text-white/80 hover:text-white"
            )}
          >
            Se connecter
          </Link>
          <CtaButton size="sm">
            Rejoindre VISIBLE
            <ArrowRight className="h-3.5 w-3.5" />
          </CtaButton>
        </div>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  2. Hero
 * ═══════════════════════════════════════════════════════════════════ */

/**
 * Faint brand seal — a decorative watermark (concentric rings + dotted
 * ring + curved tagline + the Visible mark), inspired by editorial
 * "stamp" backgrounds. Purely decorative: aria-hidden, no pointer events,
 * very low opacity, sits behind content. Tint/size/position via className
 * (e.g. `absolute -right-20 w-[560px] text-foreground/[0.05]`). Each
 * instance gets unique <path> ids (useId) so the curved-text references
 * never collide when several seals render on one page.
 */
function BrandSeal({ className }: { className?: string }) {
  const id = useId();
  const top = `${id}-t`;
  const bot = `${id}-b`;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 360 360"
      fill="none"
      stroke="currentColor"
      className={cn("pointer-events-none select-none", className)}
    >
      <defs>
        <path id={top} d="M 23,180 A 157,157 0 0 1 337,180" />
        <path id={bot} d="M 47,180 A 133,133 0 0 0 313,180" />
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
      <g
        fill="currentColor"
        stroke="none"
        style={{ fontFamily: "var(--font-sans)", fontWeight: 500 }}
      >
        <text style={{ fontSize: "13px", letterSpacing: "0.26em" }}>
          <textPath href={`#${top}`} startOffset="50%" textAnchor="middle">
            VISIBLE • PROGRAMME POUR DESIGNERS
          </textPath>
        </text>
        <text style={{ fontSize: "12px", letterSpacing: "0.22em" }}>
          <textPath href={`#${bot}`} startOffset="50%" textAnchor="middle">
            DE DESIGNER INVISIBLE À DEMANDÉ
          </textPath>
        </text>
      </g>
      {/* Visible mark (the diagonal stroke from symbol.svg), centered. */}
      <polygon
        fill="currentColor"
        stroke="none"
        points="78.81 42.68 125.88 195.76 159.64 195.76 112.56 42.68"
        transform="translate(94.3 94.2) scale(0.72)"
      />
    </svg>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-neutral-950 text-white">
      {/* Photo plein cadre, ancrée à droite, fondue dans le noir à gauche
          (lisibilité du texte) — comme une couverture éditoriale sombre. */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/alex.jpg"
          alt="Alex Landrin, fondateur de LogoMint, au micro"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/85 to-neutral-950/25 sm:via-neutral-950/75 lg:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/10 to-transparent" />
      </div>

      <div className="mx-auto flex min-h-[88vh] max-w-6xl items-center px-5 py-28 sm:py-32">
        <Reveal className="max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary sm:text-[11px]">
            Programme pour designers · accompagnement en direct
          </p>
          <h1 className="mt-6 text-[2.75rem] font-bold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
            Deviens le designer que les{" "}
            <span className="text-primary">bons clients choisissent.</span>
          </h1>

          {/* Crédibilité fondateur — chiffres réels, pas de faux témoignages. */}
          <div className="mt-7 flex items-center gap-3">
            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-white/15">
              <Image src="/alex.jpg" alt="" fill sizes="40px" className="object-cover" />
            </span>
            <p className="text-sm text-white/70">
              Par <span className="font-medium text-white">Alex</span>, fondateur de
              LogoMint — <span className="font-medium text-white">~600</span> clients
              · <span className="font-medium text-white">~10 000</span> abonnés.
            </p>
          </div>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
            VISIBLE transforme ton talent en une marque qui attire des clients
            premium — sans démarcher, sans devenir un influenceur. Ton premier
            client premium en 90 jours, ou tu es remboursé.
          </p>

          <div className="mt-9 flex flex-col items-start gap-3">
            <CtaButton className="w-full border border-black/5 bg-stone-50 text-neutral-900 shadow-xl shadow-black/25 hover:bg-white sm:w-auto">
              Rejoindre VISIBLE — tarif fondateur
              <ArrowRight className="h-4 w-4" />
            </CtaButton>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/55">
              Sans engagement · résilie quand tu veux · mobile money
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  3. Le problème
 * ═══════════════════════════════════════════════════════════════════ */

function Problem() {
  return (
    <section className="px-5 py-16 sm:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <Eyebrow>Le problème</Eyebrow>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Tu es un excellent designer. Mais ça ne suffit pas.
        </h2>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
          Tu maîtrises ton art. Pourtant tu cours après les clients, tu casses
          tes prix pour signer, et tu te sens interchangeable. Le problème
          n’est pas ton talent.{" "}
          <em>C’est que personne ne le voit.</em>{" "}
          Un designer invisible reste fauché — peu importe son niveau.
        </p>
      </Reveal>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  4. L’agitation — le coût de l’invisibilité
 * ═══════════════════════════════════════════════════════════════════ */

function Agitation() {
  const points = [
    "Tu acceptes des projets sous-payés parce que tu n’as pas le choix.",
    "Tu regardes des designers moins doués que toi décrocher les beaux contrats — juste parce qu’on les remarque.",
    "Et chaque mois qui passe sans marque forte, c’est un mois de plus à recommencer de zéro.",
  ];
  return (
    <section className="border-y border-border bg-muted/30 px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <Reveal className="text-center">
          <Eyebrow>Le vrai coût</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Le vrai prix de l’invisibilité.
          </h2>
        </Reveal>
        <ul className="mt-10 space-y-4">
          {points.map((p, i) => (
            <Reveal key={p} delay={i * 90}>
              <li className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <X className="h-4 w-4" />
                </span>
                <span className="text-base leading-relaxed text-foreground/90">
                  {p}
                </span>
              </li>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  5. La bascule — la nouvelle voie
 * ═══════════════════════════════════════════════════════════════════ */

function Switch() {
  return (
    <section className="px-5 py-16 sm:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Target className="h-6 w-6" />
        </span>
        <h2 className="mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Et si ton meilleur outil de vente, c’était ton design ?
        </h2>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
          Les gourous du business en ligne t’apprennent à vendre, à poster, à
          démarcher. Aucun ne t’apprend à utiliser{" "}
          <em>ce que tu sais déjà faire</em>{" "}
          — le design — pour devenir une marque qu’on s’arrache. C’est exactement
          ce que fait VISIBLE. Tu n’apprends pas à devenir un influenceur. Tu
          apprends à devenir{" "}
          <em>le designer évident</em>{" "}
          pour les bons clients.
        </p>
      </Reveal>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  6. Présentation de VISIBLE
 * ═══════════════════════════════════════════════════════════════════ */

function Solution() {
  return (
    <section id="programme" className="px-5 py-16 sm:py-24">
      <Reveal className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-3xl border border-primary/20 bg-primary/[0.04] p-8 text-center sm:p-12">
          <Eyebrow>La solution</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            VISIBLE, c’est quoi.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Un programme d’accompagnement{" "}
            <em>en direct</em>, chaque
            semaine, où on construit ta marque ensemble. Pas une formation que tu
            regardes seul et que tu abandonnes. Un live par semaine, une
            communauté qui te pousse, et un plan clair :{" "}
            <em>d’invisible à demandé, par le design.</em>
          </p>
        </div>
      </Reveal>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  7. Pour qui / pas pour qui
 * ═══════════════════════════════════════════════════════════════════ */

function FitMatrix() {
  const forYou = [
    "Tu sais déjà créer mais personne ne te connaît.",
    "Tu en as marre de démarcher et de te brader.",
    "Tu veux de vrais clients premium, pas des likes.",
    "Tu vends un service (design ou créatif).",
  ];
  const notForYou = [
    "Tu veux apprendre le design de zéro (ce n’est pas un cours technique).",
    "Tu cherches une recette magique sans rien faire.",
    "Tu veux juste des followers pour la frime.",
  ];
  return (
    <section className="px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <Reveal className="text-center">
          <Eyebrow>Pour qui</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            VISIBLE est fait pour toi si…
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-primary/30 bg-primary/[0.04] p-6">
              <p className="font-medium text-foreground">Pour toi si :</p>
              <ul className="mt-4 space-y-3">
                {forYou.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-foreground/90">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="h-full rounded-2xl border border-border bg-muted/30 p-6">
              <p className="font-medium text-muted-foreground">Pas pour toi si :</p>
              <ul className="mt-4 space-y-3">
                {notForYou.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <X className="mt-0.5 h-5 w-5 shrink-0 opacity-60" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  8. Les 6 modules
 * ═══════════════════════════════════════════════════════════════════ */

function ModuleCard({
  icon: Icon,
  n,
  title,
  desc,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>;
  n: number;
  title: string;
  desc: string;
  index: number;
}) {
  const [ref, inView] = useFadeUp<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn(
        "group rounded-2xl border border-border bg-card p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_0_40px_-12px_oklch(var(--primary)/0.25)]",
        FADE_TRANSITION,
        inView ? FADE_VISIBLE : FADE_INITIAL
      )}
      style={{ transitionDelay: `${index * 70}ms` }}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
          <Icon className="h-5 w-5" />
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          Module {n}
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

function Modules() {
  const modules = [
    {
      icon: Target,
      title: "Positionnement",
      desc: "Arrête d’être « un designer parmi d’autres ». Trouve l’angle qui te rend le choix évident.",
    },
    {
      icon: Palette,
      title: "Identité visuelle (ta signature)",
      desc: "Applique enfin ton talent à TA marque. Un profil et une signature qu’on reconnaît au premier coup d’œil.",
    },
    {
      icon: Megaphone,
      title: "Contenu design-led",
      desc: "Attire sans te montrer. Un système de contenu basé sur ton design, pas sur des danses TikTok.",
    },
    {
      icon: Users,
      title: "Audience d’acheteurs",
      desc: "Construis une audience de clients potentiels, pas de likes vides.",
    },
    {
      icon: Inbox,
      title: "Clients entrants",
      desc: "Le cœur du « sans démarcher » : transforme ton attention en demandes entrantes.",
    },
    {
      icon: Handshake,
      title: "Closing premium",
      desc: "Vends ta valeur, facture cher, signe ton client premium sans braderie.",
    },
  ];
  return (
    <section id="modules" className="relative overflow-hidden border-y border-border bg-muted/30 px-5 py-16 sm:py-24">
      <BrandSeal className="absolute -left-32 top-1/2 w-[460px] -translate-y-1/2 text-foreground/[0.04]" />
      <div className="relative mx-auto max-w-5xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Ce que tu obtiens</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Les 6 modules qui te rendent demandé.
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Un système complet, du positionnement au client signé.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m, i) => (
            <ModuleCard key={m.title} n={i + 1} index={i} {...m} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  9. Comment ça se passe
 * ═══════════════════════════════════════════════════════════════════ */

function HowItWorks() {
  const mechanics = [
    { icon: Video, label: "1 live interactif / semaine", desc: "avec Alex — on construit en direct." },
    { icon: Repeat, label: "Replays à vie", desc: "tu ne rates jamais rien." },
    { icon: MessageCircle, label: "Communauté privée", desc: "entraide + feedback." },
    { icon: FolderOpen, label: "Ton classeur + templates", desc: "tu exécutes, tu ne pars pas de zéro." },
    { icon: Flame, label: "Hot seats", desc: "ton travail audité en direct." },
  ];
  const timeline = [
    { day: "J+7", title: "Visible", desc: "Positionnement + profil + plan de contenu." },
    { day: "J+30", title: "Premières demandes", desc: "Ton contenu commence à attirer." },
    { day: "J+90", title: "Ton premier client premium", desc: "Tu signes — sans avoir démarché." },
  ];
  return (
    <section className="px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>La mécanique</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Comment on travaille ensemble.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {mechanics.map((m, i) => (
            <Reveal key={m.label} delay={i * 70}>
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <m.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-foreground">{m.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Timeline du parcours */}
        <Reveal className="mt-12">
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Ton parcours
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {timeline.map((step, i) => (
              <div
                key={step.day}
                className="relative rounded-2xl border border-primary/20 bg-primary/[0.04] p-6 text-center"
              >
                <span className="font-mono text-sm font-semibold text-primary">
                  {step.day}
                </span>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {step.title}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
                {i < timeline.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-primary/40 sm:block"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  10. Bonus — value stack
 * ═══════════════════════════════════════════════════════════════════ */

function Bonuses() {
  // [VALEUR] = montant d’ancrage à fournir par Alex (brief §5.10 / §7).
  const bonuses = [
    { icon: LayoutTemplate, title: "Banque de templates" },
    { icon: FileText, title: "Swipe file (hooks + scripts)" },
    { icon: Calculator, title: "Calculateur de tarifs premium" },
    { icon: Images, title: "Galerie de cas décortiqués" },
    { icon: CalendarCheck, title: "Plan express 30 jours" },
    { icon: Megaphone, title: "Meta ads avancé" },
  ];
  return (
    <section className="border-y border-border bg-muted/30 px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Et tu reçois aussi</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Les bonus inclus.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {bonuses.map((b, i) => (
            <Reveal key={b.title} delay={i * 60}>
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <b.icon className="h-5 w-5" />
                  </span>
                  <span className="font-medium text-foreground">{b.title}</span>
                </div>
                {/* Valeur d’ancrage — à remplir (placeholder grep-able). */}
                <span className="shrink-0 font-mono text-xs text-muted-foreground/70">
                  valeur : [—]
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  11. Le fondateur (Alex)
 * ═══════════════════════════════════════════════════════════════════ */

function Founder() {
  const proof: Array<{ end: number; suffix?: string; label: string }> = [
    { end: 600, suffix: "+", label: "clients LogoMint" },
    { end: 10000, suffix: "+", label: "abonnés" },
    { end: 1, suffix: " an", label: "pour y arriver" },
  ];
  return (
    <section className="px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <Reveal className="grid items-center gap-10 md:grid-cols-2">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-xs overflow-hidden rounded-2xl border border-border md:max-w-none">
            <Image
              src="/alex.jpg"
              alt="Alex, fondateur de LogoMint, en interview"
              fill
              sizes="(min-width: 768px) 22rem, 20rem"
              quality={70}
              className="object-cover"
            />
          </div>
          <div>
            <Eyebrow>Qui t’accompagne</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Alex, designer — fondateur de LogoMint.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Designer autodidacte, parti d’un iPhone 11 dans une chambre de
              15 m². Introverti — la preuve vivante qu’on n’a pas besoin
              d’être un show-man pour devenir demandé. En ~1 an, LogoMint est
              passé de zéro à une marque que les clients cherchent.
            </p>
            <dl className="mt-8 grid grid-cols-3 gap-4">
              {proof.map((s) => (
                <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center">
                  <dd className="font-mono text-2xl font-semibold tracking-tight text-foreground">
                    <CountUp end={s.end} suffix={s.suffix} locale="fr-FR" />
                  </dd>
                  <dt className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {s.label}
                  </dt>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  12. Preuve sociale
 * ═══════════════════════════════════════════════════════════════════ */

// Temporarily hidden from the page (see <main>): the section only has
// placeholder testimonials for now. Set to `true` to show it again once real
// founding-member testimonials exist.
const SHOW_SOCIAL_PROOF = false;

function SocialProof() {
  return (
    <section className="border-y border-border bg-muted/30 px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Preuve sociale</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Ils sont passés d’invisibles à demandés.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            {/* Section à remplir avec les premiers membres fondateurs. */}
            À compléter avec les témoignages des membres fondateurs.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Reveal key={i} delay={i * 80}>
              <div className="flex h-full flex-col rounded-2xl border border-dashed border-border bg-card p-6">
                <Quote className="h-6 w-6 text-primary/40" />
                <p className="mt-3 flex-1 text-sm italic leading-relaxed text-muted-foreground">
                  « [Témoignage — texte du membre : avant / après, résultat
                  concret] »
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <span className="h-9 w-9 rounded-full border border-dashed border-border bg-muted" />
                  <div>
                    <p className="text-sm font-medium text-foreground">[Prénom]</p>
                    <p className="text-xs text-muted-foreground">[@handle]</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-0.5 text-primary">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-6">
          <LabelledPlaceholder
            label="Captures de résultats · DM clients · avant / après profils"
            aspect="aspect-[16/6]"
          />
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  13. L’offre + tarif fondateur
 * ═══════════════════════════════════════════════════════════════════ */

function Offer() {
  const includes = [
    "Les 6 modules (positionnement → closing premium)",
    "1 live interactif par semaine + replays à vie",
    "Communauté privée + hot seats",
    "Classeur, templates & calculateur de tarifs",
    "Tous les bonus",
  ];
  return (
    <section id="tarif" className="scroll-mt-16 px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <Reveal className="text-center">
          <Eyebrow>L’offre</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Tout ça, pour le prix d’un projet sous-payé par mois.
          </h2>
        </Reveal>

        <Reveal delay={100} className="mt-10">
          {/* Panneau premium — vert forêt, texte clair. */}
          <div className="overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground shadow-[0_24px_60px_-24px_oklch(var(--primary)/0.6)] sm:p-10">
            <ul className="space-y-3">
              {includes.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-primary-foreground/90">
                  <Check className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 border-t border-primary-foreground/15 pt-8 text-center">
              <p className="text-sm text-primary-foreground/70">
                Valeur totale :{" "}
                <span className="line-through decoration-primary-foreground/40">
                  2 000 000 FCFA
                </span>
              </p>
              <div className="mt-2 flex items-end justify-center gap-1">
                <span className="font-mono text-5xl font-semibold tracking-tight sm:text-6xl">
                  {PRICE}
                </span>
                <span className="mb-2 text-lg text-primary-foreground/80">
                  {PRICE_UNIT}
                </span>
              </div>
              <p className="mt-1 text-sm text-primary-foreground/80">
                tout inclus · pas de frais d’entrée
              </p>

              <PaymentChooser triggerClassName="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-card px-6 py-3.5 text-base font-medium text-primary shadow-sm transition-transform duration-200 hover:scale-[1.02]">
                Rejoindre VISIBLE — tarif fondateur
                <ArrowRight className="h-4 w-4" />
              </PaymentChooser>
              <PayReassurance className="mt-3 justify-center text-primary-foreground/70" />
            </div>
          </div>
        </Reveal>

        {/* Encart tarif fondateur */}
        <Reveal delay={160} className="mt-6">
          <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/[0.06] p-5">
            <Flame className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed text-foreground/90">
              <span className="font-semibold">Tarif fondateur.</span> Les
              premiers membres bloquent{" "}
              <span className="font-semibold">{PRICE}{PRICE_UNIT} à vie</span>.
              Le prix montera ensuite — les fondateurs ne paieront jamais plus.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  14. La garantie — renversement du risque
 * ═══════════════════════════════════════════════════════════════════ */

function Guarantee() {
  const pillars = [
    {
      icon: Unlock,
      title: "Sans engagement",
      desc: "Résilie quand tu veux, en un clic.",
    },
    {
      icon: ShieldCheck,
      title: "Garantie 90 jours à l’action",
      desc: "Applique la méthode (refais ton profil, publie ton contenu). Si au bout de 90 jours tu n’as pas décroché ton premier client premium, je te rembourse.",
    },
  ];
  return (
    <section className="border-y border-border bg-muted/30 px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Le risque est pour moi, pas pour toi.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {pillars.map((p, i) => (
            <Reveal key={p.title} delay={i * 100}>
              <div className="h-full rounded-2xl border border-border bg-card p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <p.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {p.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={120}>
          <p className="mt-8 text-center text-base font-medium text-foreground">
            Soit tu signes ton client, soit tu récupères ton argent. Dans les
            deux cas, tu es couvert.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  15. L’urgence — tarif fondateur
 * ═══════════════════════════════════════════════════════════════════ */

/** Compte à rebours (utilisé uniquement si FOUNDER_DEADLINE est défini). */
function Countdown({ deadline }: { deadline: string }) {
  const [left, setLeft] = useState<number>(0);
  useEffect(() => {
    const target = new Date(deadline).getTime();
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const s = Math.floor(left / 1000);
  const units = [
    { v: Math.floor(s / 86400), l: "j" },
    { v: Math.floor((s % 86400) / 3600), l: "h" },
    { v: Math.floor((s % 3600) / 60), l: "min" },
    { v: s % 60, l: "s" },
  ];
  return (
    <div className="flex items-center justify-center gap-2">
      {units.map((u) => (
        <div
          key={u.l}
          className="min-w-14 rounded-xl bg-background/10 px-3 py-2 text-center backdrop-blur-sm"
        >
          <span className="font-mono text-2xl font-semibold tabular-nums">
            {String(u.v).padStart(2, "0")}
          </span>
          <span className="ml-0.5 text-xs opacity-70">{u.l}</span>
        </div>
      ))}
    </div>
  );
}

function Urgency() {
  return (
    <section className="px-5 py-16 sm:py-20">
      <Reveal className="mx-auto max-w-3xl">
        <div className="rounded-3xl bg-foreground p-8 text-center text-background sm:p-12">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-background/10">
            <Flame className="h-6 w-6" />
          </span>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
            Le tarif fondateur ne durera pas.
          </h2>

          {FOUNDER_DEADLINE ? (
            <>
              <p className="mx-auto mt-4 max-w-md text-sm text-background/70">
                Réservé jusqu’à la fin du compte à rebours. Après, le prix
                augmente — définitivement.
              </p>
              <div className="mt-6">
                <Countdown deadline={FOUNDER_DEADLINE} />
              </div>
            </>
          ) : (
            <p className="mx-auto mt-4 max-w-md text-sm text-background/70">
              Réservé aux{" "}
              <span className="font-semibold text-background">
                {FOUNDER_SEATS} premiers membres
              </span>
              . Après, le prix augmente — définitivement.
            </p>
          )}

          <a
            href={PRICING_ANCHOR}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-card px-6 py-3.5 text-base font-medium text-foreground transition-transform duration-200 hover:scale-[1.02]"
          >
            Bloquer mon tarif fondateur
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </Reveal>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  16. FAQ — <details> natif, zéro JS
 * ═══════════════════════════════════════════════════════════════════ */

function Faq() {
  const faqs = [
    {
      q: "Je débute / j’ai peu d’expérience ?",
      a: "Si tu sais déjà créer, tu as ta place. On ne t’apprend pas le design, on te rend visible.",
    },
    {
      q: "Je suis introverti / je déteste me montrer ?",
      a: "C’est tout l’intérêt : ton contenu, c’est ton design. Tu montres ton travail, pas ta tête.",
    },
    {
      q: "Combien de temps par semaine ?",
      a: "Un live + une action concrète. Conçu pour des gens qui bossent déjà.",
    },
    {
      q: "Et si je rate un live ?",
      a: "Tous les replays sont à vie dans Telegram.",
    },
    {
      q: "Comment je paie ?",
      a: "Mobile money (Wave, Orange Money, MTN MoMo) ou carte, via Chariow. Renouvellement chaque mois — tu gardes la main.",
    },
    {
      q: "C’est quoi la différence avec les autres formations business ?",
      a: "Les autres ignorent le design. Ici, c’est ton arme principale.",
    },
    {
      q: "Sans engagement, vraiment ?",
      a: "Oui. Tu résilies quand tu veux.",
    },
    {
      q: "J’ai fait le workshop, et mes 10 € ?",
      a: "Crédités sur ton premier mois (code promo fourni à l’inscription).",
    },
  ];
  return (
    <section id="faq" className="px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <Reveal className="text-center">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Les questions qu’on me pose.
          </h2>
        </Reveal>
        <Reveal delay={80} className="mt-10">
          <div className="divide-y divide-border border-y border-border">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                  <span className="text-base font-medium text-foreground">
                    {f.q}
                  </span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="mt-3 pr-9 text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  17. CTA final
 * ═══════════════════════════════════════════════════════════════════ */

function FinalCta() {
  return (
    <section className="relative overflow-hidden px-5 py-20 sm:py-28">
      <HeroBackdrop />
      <BrandSeal className="absolute left-1/2 top-1/2 w-[620px] -translate-x-1/2 -translate-y-1/2 text-foreground/[0.045]" />
      <Reveal className="relative mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          Tu peux rester invisible. Ou devenir{" "}
          <span className="text-primary">le designer qu’on choisit.</span>
        </h2>
        <div className="mt-8 flex flex-col items-center gap-3">
          <CtaButton className="w-full sm:w-auto">
            Rejoindre VISIBLE — tarif fondateur
            <ArrowRight className="h-4 w-4" />
          </CtaButton>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Sans engagement · garantie 90 jours · mobile money
          </p>
          <PayReassurance className="mt-1 justify-center" />
        </div>
      </Reveal>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  18. Footer
 * ═══════════════════════════════════════════════════════════════════ */

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-card pb-24 md:pb-0">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              De designer invisible à designer demandé.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Conditions
            </Link>
            <Link href="/help" className="transition-colors hover:text-foreground">
              Aide
            </Link>
            <a
              href="mailto:support@visible.com"
              className="transition-colors hover:text-foreground"
            >
              Contact
            </a>
            <Link href="/sign-in" className="transition-colors hover:text-foreground">
              Se connecter
            </Link>
          </nav>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>© {year} VISIBLE. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  19. Barre CTA collante (mobile)
 * ═══════════════════════════════════════════════════════════════════ */

function StickyMobileCta() {
  // Apparaît une fois le hero passé pour ne pas concurrencer le CTA hero.
  const scrolled = useScrolled(640);
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/90 backdrop-blur-md transition-transform duration-300 ease-out md:hidden",
        "px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        scrolled ? "translate-y-0" : "translate-y-full"
      )}
    >
      <a
        href={PRICING_ANCHOR}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-sm"
      >
        Rejoindre VISIBLE — {PRICE}{PRICE_UNIT}
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  Le calcul — ROI honnête : ce que tu paies vs la valeur reçue.
 *  Rendu entre la preuve sociale et l’offre (voir <main>). Hoisté, donc
 *  défini ici en fin de fichier. Pas de revenus « moyens » inventés :
 *  côté gauche = coûts réels, côté droit = valeur du programme + objectif
 *  garanti. La seule promesse chiffrée reste la garantie 90 jours.
 * ═══════════════════════════════════════════════════════════════════ */

function TheMath() {
  const spend = [
    { big: "150 000 FCFA", label: "ton investissement sur 90 jours" },
    { big: "≈ 12 000 FCFA", label: "par semaine" },
    { big: "0 risque", label: "remboursé sans client premium en 90 jours" },
  ];
  const receive = [
    { big: "2 000 000 FCFA", label: "de valeur — modules, lives, communauté, bonus" },
    { big: "1 client premium", label: "l’objectif, en 90 jours" },
    { big: "Une marque", label: "qui attire des clients, à vie" },
  ];
  return (
    <section className="px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Le calcul</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Bon, faisons le calcul.
          </h2>
        </Reveal>

        <Reveal delay={100} className="mt-10">
          <div className="grid overflow-hidden rounded-3xl border border-border sm:grid-cols-2">
            {/* Ce que tu paies — coûts réels */}
            <div className="border-b border-border p-6 sm:border-b-0 sm:border-r sm:p-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Ce que tu paies
              </p>
              <ul className="mt-6 space-y-6">
                {spend.map((r) => (
                  <li key={r.big}>
                    <p className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                      {r.big}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{r.label}</p>
                  </li>
                ))}
              </ul>
            </div>
            {/* Ce que tu reçois — valeur + objectif */}
            <div className="bg-primary/[0.04] p-6 sm:p-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                Ce que tu reçois
              </p>
              <ul className="mt-6 space-y-6">
                {receive.map((r) => (
                  <li key={r.big}>
                    <p className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
                      {r.big}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{r.label}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-foreground">
            Tu paies <em>150 000 FCFA</em> sur 90 jours. Un seul client premium
            peut le rembourser — et la garantie couvre le reste.
          </p>
        </Reveal>

        <Reveal delay={160}>
          <p className="mx-auto mt-4 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
            La valeur affichée reflète ce que vaut le programme, pas une
            promesse de revenus : tes résultats dépendent de ton travail. Notre
            seul engagement chiffré — ton premier client premium en 90 jours, ou
            remboursé.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

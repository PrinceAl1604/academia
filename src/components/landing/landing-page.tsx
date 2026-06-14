"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  TrendingUp,
  Calendar,
  Languages,
  Crown,
  Gift,
  Sparkles,
  Check,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/shared/logo";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { useLanguage } from "@/lib/i18n/language-context";
import { useFadeUp } from "@/lib/hooks/use-fade-up";
import { CountUp } from "@/components/landing/count-up";
import { cn } from "@/lib/utils";

// Tailwind class strings reused across every fade-up section. Hoisted
// so we tune the timing in one place. duration-700 + ease-out matches
// the rest of the app's transitions; translate-y-6 keeps the upward
// movement subtle (24px) — anything bigger reads as a swoosh.
const FADE_INITIAL = "opacity-0 translate-y-6";
const FADE_VISIBLE = "opacity-100 translate-y-0";
const FADE_TRANSITION = "transition-all duration-700 ease-out";

/**
 * Returns true once the page has scrolled past `threshold` pixels.
 * Used by the sticky-nav fade-in and could be reused for "back to
 * top" buttons etc. Listener uses passive:true so scrolling stays
 * smooth on mobile; browsers throttle scroll events natively so no
 * manual rAF debounce is needed at this volume.
 */
function useScrolled(threshold: number) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll(); // sync state with current scroll position on mount
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

/**
 * Fixed-position progress bar pinned to the very top of the viewport.
 * Width = scrollY / (scrollHeight - viewportHeight). Updates on every
 * scroll tick via direct style mutation (state-based would cause a
 * React render per tick, which dominates the budget on long pages).
 *
 * Rendered before the nav so it sits visually above it; z-[60] beats
 * the nav's z-50.
 */
function ScrollProgress() {
  // Direct style mutation on every scroll tick — using React state
  // would re-render the whole component (and parents) per tick, which
  // adds up fast on long pages. The bar's only DOM property that
  // changes is `width`, so we set it imperatively. The render output
  // never changes after mount.
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const update = () => {
      const scrolled = window.scrollY;
      const max =
        document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (scrolled / max) * 100 : 0;
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

/**
 * Marketing landing page — Supabase-inspired anatomy.
 *
 * Lives at `/` for unauthenticated visitors (logged-in users see the
 * catalog at the same URL; the page.tsx branches on auth state).
 *
 * Eight scrollable sections, top → bottom:
 *   1. <LandingNav />        sticky top, minimal marketing nav
 *   2. <Hero />              headline + 2 CTAs + product visual
 *   3. <Stats />              "X students · Y hours · Z sessions" strip
 *   4. <Features />          6-pillar value grid
 *   5. <Showcase />          three deep-dive product sections
 *   6. <Audience />          three audience cards
 *   7. <Pricing />           Free vs Pro teaser
 *   8. <FinalCta />          big closing CTA card
 *   9. <Footer />            link columns + social
 *
 * Copy is intentionally lorem ipsum for v1 — real strings come from
 * marketing later. Visual screenshots are LabelledPlaceholder boxes
 * (clearly marked + grep-able so they're trivial to swap when the
 * real screenshots arrive).
 */
export function LandingPage() {
  // Enable smooth-scroll only while the landing page is mounted —
  // setting it on <html> globally affects every page in the app, and
  // the dashboard's quick anchor jumps feel sluggish with it on.
  // Scoping to mount/unmount keeps it landing-only.
  //
  // Browsers automatically respect prefers-reduced-motion for
  // scroll-behavior: smooth, so no manual gate needed here.
  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgress />
      <LandingNav />
      <main>
        <Hero />
        <Stats />
        <Features />
        <Showcase />
        <Audience />
        <Pricing />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
 *  Shared bits — placeholder + decorative backgrounds
 * ═══════════════════════════════════════════════════════════ */

/**
 * Marked placeholder box for screenshots/demos that haven't been
 * produced yet. Visually obvious (dashed border, "Screenshot
 * placeholder" label) so it's hard to ship to production by
 * accident, and easy to grep for: `LabelledPlaceholder`.
 */
function LabelledPlaceholder({
  label,
  aspect = "aspect-video",
  className,
}: {
  label: string;
  aspect?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/30 text-muted-foreground/60",
        aspect,
        className
      )}
    >
      <div className="flex flex-col items-center gap-2 px-6 text-center">
        <ImageIcon className="h-6 w-6" />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
    </div>
  );
}

/**
 * Dot-grid + green-glow background combo. The grid is a CSS radial
 * gradient repeated at 24×24px, kept very low contrast. The glow is
 * a single soft ellipse pinned to the top of the section. Together
 * they give the section its "Supabase look" without dominating.
 */
function HeroBackdrop() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,_oklch(var(--muted-foreground)/0.18)_1px,_transparent_1px)] [background-size:24px_24px] opacity-50"
      />
      {/* H1 — slow opacity pulse (5s cycle, 1 → 0.65 → 1) defined in
          globals.css as `.animate-glow-pulse`. Subtle enough that you
          don't consciously notice motion, just feels "alive". */}
      <div
        aria-hidden
        className="animate-glow-pulse pointer-events-none absolute inset-x-0 -top-32 h-[520px] [background:radial-gradient(ellipse_60%_50%_at_50%_0%,_oklch(var(--primary)/0.18)_0%,_transparent_70%)]"
      />
    </>
  );
}

/**
 * Mono uppercase preheader — used above every section title. Borrows
 * Supabase's "/ SECTION" rhythm.
 */
function Preheader({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
      <span className="opacity-60">/</span> {children}
    </p>
  );
}

/* ═══════════════════════════════════════════════════════════
 *  1. Navbar
 * ═══════════════════════════════════════════════════════════ */

// Tailwind utility chain for the nav-link underline-draw effect (T1).
// Hoisted so all 4 links share the exact same chain — easier to tune.
//   - `relative`: parent for the ::after pseudo-element
//   - `after:absolute inset-x-0 -bottom-1 h-px`: 1px underline beneath
//   - `after:bg-current`: matches the link's text color (gray → white
//     on hover, no extra color logic needed)
//   - `after:origin-left after:scale-x-0`: starts hidden, anchored left
//   - `after:transition-transform after:duration-200 after:ease-out`
//   - `hover:after:scale-x-100`: full-width on hover
const NAV_LINK_CLASS =
  "relative text-sm text-muted-foreground transition-colors hover:text-foreground " +
  "after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:bg-current " +
  "after:origin-left after:scale-x-0 after:transition-transform after:duration-200 after:ease-out " +
  "hover:after:scale-x-100";

function LandingNav() {
  const { t } = useLanguage();
  // P3 — nav is transparent at top, solidifies after ~60px scroll.
  // The threshold is small (not 200+) so the effect kicks in as
  // soon as the user starts engaging with the page, not after they
  // pass the hero.
  const scrolled = useScrolled(60);
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-out",
        scrolled
          ? "border-b border-border/40 bg-background/70 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className={NAV_LINK_CLASS}>
            {t.landing.navFeatures}
          </a>
          <a href="#showcase" className={NAV_LINK_CLASS}>
            {t.landing.navHowItWorks}
          </a>
          <a href="#audience" className={NAV_LINK_CLASS}>
            {t.landing.navAudience}
          </a>
          <a href="#pricing" className={NAV_LINK_CLASS}>
            {t.landing.navPricing}
          </a>
        </nav>
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Language toggle — reuses the shared component so the
              user's choice persists into the app after sign-up. */}
          <LanguageToggle />
          <Link
            href="/sign-in"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            {t.landing.navSignIn}
          </Link>
          <Button render={<Link href="/sign-up" />}>
            {t.landing.navGetStarted}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════
 *  2. Hero
 * ═══════════════════════════════════════════════════════════ */

function Hero() {
  const { t } = useLanguage();
  return (
    <section className="relative overflow-hidden pt-36 pb-24 lg:pt-44 lg:pb-32">
      <HeroBackdrop />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div>
          <Preheader>{t.landing.heroPreheader}</Preheader>
          <h1 className="mt-5 text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl">
            {t.landing.heroTitleStart}
            <span className="text-primary">{t.landing.heroTitleHighlight}</span>
            {t.landing.heroTitleEnd}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t.landing.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" render={<Link href="/sign-up" />}>
              {t.landing.heroCtaPrimary}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="#showcase" />}>
              {t.landing.heroCtaSecondary}
            </Button>
          </div>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
            <span className="opacity-60">/</span> {t.landing.heroMicrocopy}
          </p>
        </div>
        <LabelledPlaceholder
          label="Hero screenshot · 4:3 · product mock"
          aspect="aspect-[4/3]"
        />
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
 *  3. Stats strip ("trusted by" replacement for an EDU product)
 * ═══════════════════════════════════════════════════════════ */

function Stats() {
  const { t, language } = useLanguage();
  const [ref, inView] = useFadeUp<HTMLElement>();

  // Stats split into two shapes:
  //   - numeric → CountUp animates 0 → end (with optional suffix)
  //   - literal → static string (used for the "EN / FR" pair which
  //     isn't a number at all)
  // The CountUp component locale-formats the running value so FR
  // visitors see "10 000+" while EN visitors see "10,000+".
  const locale = language === "fr" ? "fr-FR" : "en-US";
  const stats: Array<
    | { kind: "numeric"; end: number; suffix?: string; label: string }
    | { kind: "literal"; value: string; label: string }
  > = [
    { kind: "numeric", end: 10000, suffix: "+", label: t.landing.statsLabel1 },
    { kind: "numeric", end: 200, suffix: "+", label: t.landing.statsLabel2 },
    { kind: "numeric", end: 98, suffix: "%", label: t.landing.statsLabel3 },
    { kind: "literal", value: "EN / FR", label: t.landing.statsLabel4 },
  ];
  return (
    <section
      ref={ref}
      className={cn(
        "border-y border-border/40 bg-card/20",
        FADE_TRANSITION,
        inView ? FADE_VISIBLE : FADE_INITIAL
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <Preheader>{t.landing.statsPreheader}</Preheader>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                "text-center",
                FADE_TRANSITION,
                inView ? FADE_VISIBLE : FADE_INITIAL
              )}
              // Tiny per-stat stagger (80ms) so the four numbers
              // appear in a wave from left to right rather than
              // landing all at once. Subtle enough that you don't
              // consciously notice — just feels "alive".
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <p className="font-mono text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                {stat.kind === "numeric" ? (
                  <CountUp
                    end={stat.end}
                    suffix={stat.suffix}
                    locale={locale}
                  />
                ) : (
                  stat.value
                )}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
 *  4. 6-pillar feature grid
 * ═══════════════════════════════════════════════════════════ */

/**
 * Extracted so each card can call useFadeUp independently — required
 * by the Rules of Hooks (you can't call a hook inside a .map). The
 * `index` prop drives the stagger delay so cards appear in sequence
 * rather than landing as a single block.
 *
 * Hover enhancement:
 *   - Border shifts toward the primary green (was border-border)
 *   - Tiny scale on the icon chip (1.0 → 1.05)
 *   - Subtle green glow shadow appears (matches the hero glow palette)
 * Each effect is gated behind `group-hover:` so they fire together.
 */
function FeatureCard({
  icon: Icon,
  title,
  desc,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  index: number;
}) {
  const [ref, inView] = useFadeUp<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn(
        "group rounded-2xl border border-border/60 bg-card/40 p-6",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:border-primary/40 hover:bg-card/60",
        "hover:shadow-[0_0_40px_-10px_oklch(var(--primary)/0.25)]",
        FADE_TRANSITION,
        inView ? FADE_VISIBLE : FADE_INITIAL
      )}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {desc}
      </p>
    </div>
  );
}

function Features() {
  const { t } = useLanguage();
  const [headerRef, headerInView] = useFadeUp<HTMLDivElement>();
  const features = [
    { icon: BookOpen, title: t.landing.feature1Title, desc: t.landing.feature1Desc },
    { icon: Calendar, title: t.landing.feature2Title, desc: t.landing.feature2Desc },
    { icon: TrendingUp, title: t.landing.feature3Title, desc: t.landing.feature3Desc },
    { icon: Languages, title: t.landing.feature4Title, desc: t.landing.feature4Desc },
    { icon: Crown, title: t.landing.feature5Title, desc: t.landing.feature5Desc },
    { icon: Gift, title: t.landing.feature6Title, desc: t.landing.feature6Desc },
  ];
  return (
    <section id="features" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className={cn(
            "mx-auto max-w-2xl text-center",
            FADE_TRANSITION,
            headerInView ? FADE_VISIBLE : FADE_INITIAL
          )}
        >
          <Preheader>{t.landing.featuresPreheader}</Preheader>
          <h2 className="mt-4 text-3xl font-medium tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t.landing.featuresTitle}
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            {t.landing.featuresSubtitle}
          </p>
        </div>
        <div className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <FeatureCard
              key={f.title}
              icon={f.icon}
              title={f.title}
              desc={f.desc}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
 *  5. Product deep-dives (three sections, alternating layout)
 * ═══════════════════════════════════════════════════════════ */

interface ShowcaseSectionProps {
  tag: string;
  title: string;
  body: string;
  bullets: string[];
  placeholderLabel: string;
  linkLabel: string;
  flip?: boolean;
}

function ShowcaseSection({
  tag,
  title,
  body,
  bullets,
  placeholderLabel,
  linkLabel,
  flip = false,
}: ShowcaseSectionProps) {
  const [ref, inView] = useFadeUp<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn(
        "grid items-center gap-12 lg:grid-cols-2 lg:gap-16",
        flip && "lg:[&>div:first-child]:order-2",
        FADE_TRANSITION,
        inView ? FADE_VISIBLE : FADE_INITIAL
      )}
    >
      <div>
        <Preheader>{tag}</Preheader>
        <h3 className="mt-4 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
          {title}
        </h3>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          {body}
        </p>
        <ul className="mt-6 space-y-2.5">
          {bullets.map((b, i) => (
            // S1 — each bullet fades in independently with a stagger.
            // Delay = 400 + i*80ms from when the section becomes
            // in-view, so bullets start appearing as the parent
            // section's 700ms fade is settling. Last bullet visible
            // ~1140ms after the section first enters the viewport.
            //
            // Note on CSS opacity composition: while the PARENT
            // section is at opacity-0, its bullets are invisible
            // regardless of their own opacity state (multiplicative).
            // Once the parent reaches opacity-1, the bullets'
            // own delayed transition becomes visible — giving the
            // staggered "appear" effect.
            <li
              key={b}
              className={cn(
                "flex items-start gap-2.5 text-sm text-muted-foreground",
                "transition-all duration-500 ease-out",
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              )}
              style={{
                transitionDelay: inView ? `${400 + i * 80}ms` : "0ms",
              }}
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <Button variant="ghost" className="mt-6 -ml-3" render={<Link href="/sign-up" />}>
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      <LabelledPlaceholder
        label={placeholderLabel}
        aspect="aspect-[4/3]"
      />
    </div>
  );
}

function Showcase() {
  const { t } = useLanguage();
  return (
    <section id="showcase" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl space-y-32 px-4 sm:px-6 lg:px-8">
        <ShowcaseSection
          tag={t.landing.showcase1Tag}
          title={t.landing.showcase1Title}
          body={t.landing.showcase1Body}
          bullets={[
            t.landing.showcase1Bullet1,
            t.landing.showcase1Bullet2,
            t.landing.showcase1Bullet3,
            t.landing.showcase1Bullet4,
          ]}
          placeholderLabel="Course player screenshot · 4:3"
          linkLabel={t.landing.showcase1Link}
        />
        <ShowcaseSection
          tag={t.landing.showcase2Tag}
          title={t.landing.showcase2Title}
          body={t.landing.showcase2Body}
          bullets={[
            t.landing.showcase2Bullet1,
            t.landing.showcase2Bullet2,
            t.landing.showcase2Bullet3,
            t.landing.showcase2Bullet4,
          ]}
          placeholderLabel="Live session schedule screenshot · 4:3"
          linkLabel={t.landing.showcase2Link}
          flip
        />
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
 *  6. Audience matrix
 * ═══════════════════════════════════════════════════════════ */

function PersonaCard({
  title,
  desc,
  index,
  ctaLabel,
}: {
  title: string;
  desc: string;
  index: number;
  ctaLabel: string;
}) {
  const [ref, inView] = useFadeUp<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn(
        "group rounded-2xl border border-border/60 bg-card/40 p-8",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:border-primary/40",
        "hover:shadow-[0_0_40px_-10px_oklch(var(--primary)/0.25)]",
        FADE_TRANSITION,
        inView ? FADE_VISIBLE : FADE_INITIAL
      )}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
        <Sparkles className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {desc}
      </p>
      <Link
        href="/sign-up"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-transform duration-300 hover:gap-2 hover:underline"
      >
        {ctaLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function Audience() {
  const { t } = useLanguage();
  const [headerRef, headerInView] = useFadeUp<HTMLDivElement>();
  const personas = [
    { title: t.landing.audience1Title, desc: t.landing.audience1Desc },
    { title: t.landing.audience2Title, desc: t.landing.audience2Desc },
    { title: t.landing.audience3Title, desc: t.landing.audience3Desc },
  ];
  return (
    <section id="audience" className="border-t border-border/40 bg-card/10 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className={cn(
            "mx-auto max-w-2xl text-center",
            FADE_TRANSITION,
            headerInView ? FADE_VISIBLE : FADE_INITIAL
          )}
        >
          <Preheader>{t.landing.audiencePreheader}</Preheader>
          <h2 className="mt-4 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            {t.landing.audienceTitle}
          </h2>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {personas.map((p, i) => (
            <PersonaCard
              key={p.title}
              title={p.title}
              desc={p.desc}
              index={i}
              ctaLabel={t.landing.audienceLinkLabel}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
 *  7. Pricing teaser
 * ═══════════════════════════════════════════════════════════ */

function Pricing() {
  const { t } = useLanguage();
  const [headerRef, headerInView] = useFadeUp<HTMLDivElement>();
  const [cardsRef, cardsInView] = useFadeUp<HTMLDivElement>();
  return (
    <section id="pricing" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className={cn(
            "mx-auto max-w-2xl text-center",
            FADE_TRANSITION,
            headerInView ? FADE_VISIBLE : FADE_INITIAL
          )}
        >
          <Preheader>{t.landing.pricingPreheader}</Preheader>
          <h2 className="mt-4 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            {t.landing.pricingTitle}
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            {t.landing.pricingSubtitle}
          </p>
        </div>
        <div
          ref={cardsRef}
          className={cn(
            "mt-16 grid gap-6 md:grid-cols-2 lg:mx-auto lg:max-w-4xl",
            FADE_TRANSITION,
            cardsInView ? FADE_VISIBLE : FADE_INITIAL
          )}
        >
          {/* Free tier — gentle hover lift, no glow (the Pro card
              owns the green glow so the visual hierarchy stays
              clear about which plan we want them on). */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-border">
            <h3 className="text-lg font-medium text-foreground">{t.landing.pricingFreeName}</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-mono text-4xl font-medium tracking-tight text-foreground">
                {t.landing.pricingFreePrice}
              </span>
              <span className="text-sm text-muted-foreground">{t.landing.pricingFreeUnit}</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {t.landing.pricingFreeSummary}
            </p>
            <ul className="mt-6 space-y-2.5">
              {[
                t.landing.pricingFreeFeature1,
                t.landing.pricingFreeFeature2,
                t.landing.pricingFreeFeature3,
                t.landing.pricingFreeFeature4,
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="mt-8 w-full"
              render={<Link href="/sign-up" />}
            >
              {t.landing.pricingFreeCta}
            </Button>
          </div>
          {/* Pro tier — highlighted. On hover the green glow shadow
              intensifies (was -20px feathered, becomes -10px) AND the
              card lifts 1px — reads as "leaning toward the visitor"
              when they consider it. */}
          <div className="relative rounded-2xl border border-primary/40 bg-card/60 p-8 shadow-[0_0_60px_-20px_oklch(var(--primary)/0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_80px_-10px_oklch(var(--primary)/0.6)]">
            <Badge className="absolute -top-3 left-8 bg-primary text-primary-foreground">
              {t.landing.pricingProBadge}
            </Badge>
            <h3 className="text-lg font-medium text-foreground">{t.landing.pricingProName}</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-mono text-4xl font-medium tracking-tight text-foreground">
                {t.landing.pricingProPrice}
              </span>
              <span className="text-sm text-muted-foreground">{t.landing.pricingProUnit}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground/70">
              {t.landing.pricingProCancelAnytime}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {t.landing.pricingProSummary}
            </p>
            <ul className="mt-6 space-y-2.5">
              {[
                t.landing.pricingProFeature1,
                t.landing.pricingProFeature2,
                t.landing.pricingProFeature3,
                t.landing.pricingProFeature4,
                t.landing.pricingProFeature5,
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/90">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button className="mt-8 w-full" render={<Link href="/sign-up" />}>
              {t.landing.pricingProCta}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
 *  8. Final CTA
 * ═══════════════════════════════════════════════════════════ */

function FinalCta() {
  const { t } = useLanguage();
  const [ref, inView] = useFadeUp<HTMLDivElement>();
  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      <HeroBackdrop />
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={cn(
            "rounded-3xl border border-border/60 bg-card/40 p-12 text-center backdrop-blur-sm lg:p-16",
            FADE_TRANSITION,
            inView ? FADE_VISIBLE : FADE_INITIAL
          )}
        >
          <Preheader>{t.landing.finalCtaPreheader}</Preheader>
          <h2 className="mt-4 text-3xl font-medium tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t.landing.finalCtaTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            {t.landing.finalCtaSubtitle}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" render={<Link href="/sign-up" />}>
              {t.landing.finalCtaPrimary}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="#pricing" />}>
              {t.landing.finalCtaSecondary}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
 *  9. Footer
 * ═══════════════════════════════════════════════════════════ */

function Footer() {
  const { t } = useLanguage();
  const columns = [
    {
      heading: t.landing.footerColProduct,
      links: [
        t.landing.footerProductCourses,
        t.landing.footerProductSessions,
        t.landing.footerProductPricing,
        t.landing.footerProductMobile,
      ],
    },
    {
      heading: t.landing.footerColResources,
      links: [
        t.landing.footerResourcesHelp,
        t.landing.footerResourcesBlog,
        t.landing.footerResourcesRefer,
        t.landing.footerResourcesStatus,
      ],
    },
    {
      heading: t.landing.footerColCompany,
      links: [
        t.landing.footerCompanyAbout,
        t.landing.footerCompanyContact,
        t.landing.footerCompanyCareers,
        t.landing.footerCompanyPress,
      ],
    },
    {
      heading: t.landing.footerColLegal,
      links: [
        t.landing.footerLegalPrivacy,
        t.landing.footerLegalTerms,
        t.landing.footerLegalCookies,
        t.landing.footerLegalImprint,
      ],
    },
  ];
  return (
    <footer className="border-t border-border/40 bg-card/20">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              {t.landing.footerTagline}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((col) => (
              <div key={col.heading}>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {col.heading}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-muted-foreground/80 transition-colors hover:text-foreground"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border/40 pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} Brightroots. {t.landing.footerCopyright}
          </p>
          <p className="font-mono uppercase tracking-[0.18em]">
            {t.landing.footerMadeIn}
          </p>
        </div>
      </div>
    </footer>
  );
}

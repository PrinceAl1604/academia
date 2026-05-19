"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Users,
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
import { cn } from "@/lib/utils";

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
  return (
    <div className="min-h-screen bg-background text-foreground">
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 h-[520px] [background:radial-gradient(ellipse_60%_50%_at_50%_0%,_oklch(var(--primary)/0.18)_0%,_transparent_70%)]"
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

function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#showcase"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </a>
          <a
            href="#audience"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Who it&apos;s for
          </a>
          <a
            href="#pricing"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Sign in
          </Link>
          <Button render={<Link href="/sign-up" />}>
            Get started
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
  return (
    <section className="relative overflow-hidden pt-36 pb-24 lg:pt-44 lg:pb-32">
      <HeroBackdrop />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div>
          <Preheader>Brightroots</Preheader>
          <h1 className="mt-5 text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl">
            Build the <span className="text-primary">personal brand</span> that opens doors.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Premium courses, live one-on-one mentors, and a focused community —
            built for people growing a reputation, a following, or a freelance
            practice.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" render={<Link href="/sign-up" />}>
              Start free
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="#showcase" />}>
              See what&apos;s inside
            </Button>
          </div>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
            <span className="opacity-60">/</span> Free to join · No credit card needed
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
  const stats = [
    { value: "10,000+", label: "Members growing with us" },
    { value: "200+", label: "Hours of premium content" },
    { value: "98%", label: "Would recommend to a friend" },
    // Bilingual is part of the value prop, not an inflated stat —
    // pairing the EN/FR token with a label that reads as a feature
    // keeps the row honest at pre-launch numbers.
    { value: "EN / FR", label: "Every course bilingual" },
  ];
  return (
    <section className="border-y border-border/40 bg-card/20">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <Preheader>Built for people who actually use it</Preheader>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-mono text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                {stat.value}
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

function Features() {
  const features = [
    {
      icon: BookOpen,
      title: "Courses built to be used",
      desc: "Practical lessons from people who've done the work. No theory, no filler — just what helps you ship.",
    },
    {
      icon: Calendar,
      title: "Real time with real mentors",
      desc: "Book one-on-one or small-group sessions with experts who answer your questions. Two every month, included.",
    },
    {
      icon: Users,
      title: "A room of people climbing too",
      desc: "Channels for every topic. Direct messages with admins and mentors. Quiet enough to focus, busy enough to matter.",
    },
    {
      icon: Languages,
      title: "English and French, side by side",
      desc: "Every course, every session, every conversation — switch languages with a click.",
    },
    {
      icon: Crown,
      title: "One subscription, everything unlocked",
      desc: "Premium courses, live sessions, direct messages, community. One price, no upsells.",
    },
    {
      icon: Gift,
      title: "Refer a friend, grow together",
      desc: "Send the link. When they go Pro, you both get a month free. Your network becomes your runway.",
    },
  ];
  return (
    <section id="features" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Preheader>Features</Preheader>
          <h2 className="mt-4 text-3xl font-medium tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Everything you need to grow your name
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Six pieces that work together — courses, mentorship, community,
            and the system that ties them.
          </p>
        </div>
        <div className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group rounded-2xl border border-border/60 bg-card/40 p-6 transition-all hover:-translate-y-0.5 hover:border-border hover:bg-card/60"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-medium text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            );
          })}
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
  return (
    <div
      className={cn(
        "grid items-center gap-12 lg:grid-cols-2 lg:gap-16",
        flip && "lg:[&>div:first-child]:order-2"
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
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-muted-foreground">
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
  return (
    <section id="showcase" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl space-y-32 px-4 sm:px-6 lg:px-8">
        <ShowcaseSection
          tag="Courses"
          title="Learn from people who've done it"
          body="Every course on Brightroots is taught by someone who actually built what they're teaching. You get the playbooks, the templates, the real decisions — not theory. Watch on any device, at your pace."
          bullets={[
            "Premium video lessons with real examples",
            "Step-by-step progress that picks up where you left off",
            "Bilingual — every course works in English and French",
            "New courses added every month",
          ]}
          placeholderLabel="Course player screenshot · 4:3"
          linkLabel="Browse the catalog"
        />
        <ShowcaseSection
          tag="Live sessions"
          title="Mentorship that actually shows up"
          body="Two live sessions a month with mentors who know your field. Bring a real question, leave with a real answer. Calendar invite, reminders, and instant join — from any device."
          bullets={[
            "Two sessions every month with your Pro membership",
            "One-on-one for deep work, small groups for breadth",
            "Calendar invite + reminder so you never miss one",
            "Join from your phone, laptop, anywhere",
          ]}
          placeholderLabel="Live session schedule screenshot · 4:3"
          linkLabel="See upcoming sessions"
          flip
        />
        <ShowcaseSection
          tag="Community"
          title="Grow with people doing the same"
          body="A focused community of people building their brand and their career. No algorithm, no doomscroll. Channels for every topic. Direct messages for the real conversations."
          bullets={[
            "Channels for courses, careers, and craft",
            "Direct message anyone — including admins and mentors",
            "Mentions, threads, pinned messages — everything just works",
            "Push notifications when your name comes up",
          ]}
          placeholderLabel="Community chat screenshot · 4:3"
          linkLabel="Step inside"
        />
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
 *  6. Audience matrix
 * ═══════════════════════════════════════════════════════════ */

function Audience() {
  const personas = [
    {
      title: "Creators & storytellers",
      desc: "If you make things — videos, writing, photography, music — Brightroots helps you turn craft into reputation. Reach more people, on your terms.",
    },
    {
      title: "Freelancers & consultants",
      desc: "Stop chasing every gig. Build a name strong enough that the right clients come to you. Courses on positioning, packaging, and pricing — taught by people who charge well.",
    },
    {
      title: "Students & ambitious newcomers",
      desc: "The earlier you start, the further it carries. Build the skills, the network, and the visibility that turn a job offer into the right offer.",
    },
  ];
  return (
    <section id="audience" className="border-t border-border/40 bg-card/10 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Preheader>Built for</Preheader>
          <h2 className="mt-4 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Built for the work you&apos;re doing now
          </h2>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {personas.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-border/60 bg-card/40 p-8"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-medium text-foreground">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {p.desc}
              </p>
              <Link
                href="/sign-up"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                See how
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
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
  return (
    <section id="pricing" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Preheader>Pricing</Preheader>
          <h2 className="mt-4 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Simple pricing. Grown-up product.
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Try everything that&apos;s free. Upgrade when you&apos;re ready to go further.
          </p>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:mx-auto lg:max-w-4xl">
          {/* Free tier */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-8">
            <h3 className="text-lg font-medium text-foreground">Free</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-mono text-4xl font-medium tracking-tight text-foreground">
                0
              </span>
              <span className="text-sm text-muted-foreground">FCFA</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Get a feel for Brightroots before going Pro.
            </p>
            <ul className="mt-6 space-y-2.5">
              {[
                "Browse the full course catalog",
                "Watch free lessons in every course",
                "Read the community",
                "English and French",
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
              Join free
            </Button>
          </div>
          {/* Pro tier — highlighted */}
          <div className="relative rounded-2xl border border-primary/40 bg-card/60 p-8 shadow-[0_0_60px_-20px_oklch(var(--primary)/0.4)]">
            <Badge className="absolute -top-3 left-8 bg-primary text-primary-foreground">
              Most popular
            </Badge>
            <h3 className="text-lg font-medium text-foreground">Pro</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-mono text-4xl font-medium tracking-tight text-foreground">
                15,000
              </span>
              <span className="text-sm text-muted-foreground">FCFA / month</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Cancel anytime.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Everything you need to build a brand that lasts.
            </p>
            <ul className="mt-6 space-y-2.5">
              {[
                "Every premium course, unlocked",
                "Two live mentor sessions every month",
                "Direct messages with admins and mentors",
                "Full community access — channels, DMs, mentions",
                "Push notifications and calendar sync",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/90">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button className="mt-8 w-full" render={<Link href="/sign-up" />}>
              Start Pro
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
  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      <HeroBackdrop />
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border/60 bg-card/40 p-12 text-center backdrop-blur-sm lg:p-16">
          <Preheader>Start today</Preheader>
          <h2 className="mt-4 text-3xl font-medium tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Your brand grows when you do
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Join the people building their reputation one lesson and one
            conversation at a time. Free to start, no card needed.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" render={<Link href="/sign-up" />}>
              Create your free account
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="#pricing" />}>
              See pricing
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
  const columns = [
    {
      heading: "Product",
      links: ["Courses", "Live sessions", "Community", "Mobile app"],
    },
    {
      heading: "Resources",
      links: ["Help center", "Blog", "Refer a friend", "Status"],
    },
    {
      heading: "Company",
      links: ["About", "Contact", "Careers", "Press"],
    },
    {
      heading: "Legal",
      links: ["Privacy", "Terms", "Cookies", "Imprint"],
    },
  ];
  return (
    <footer className="border-t border-border/40 bg-card/20">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Where personal brands take root.
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
            © {new Date().getFullYear()} Brightroots. All rights reserved.
          </p>
          <p className="font-mono uppercase tracking-[0.18em]">
            Made in West Africa, for the world
          </p>
        </div>
      </div>
    </footer>
  );
}

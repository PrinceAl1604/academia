import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// Geist Mono powers the new design language's metadata typography —
// timestamps, prices, durations, counts. Using a true monospace (rather
// than `tabular-nums` on a proportional face) keeps figure widths perfectly
// even, which reads as deliberate at small sizes.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

import { LanguageProvider } from "@/lib/i18n/language-context";
import { AuthProvider } from "@/lib/auth-context";
import { ProgressProvider } from "@/lib/progress-context";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Brightroots — Learn from the best",
    template: "%s | Brightroots",
  },
  description:
    "Access premium courses taught by industry experts. One subscription, unlimited learning.",
  icons: {
    // Single brand symbol for all favicon contexts. The previous dual
    // light/dark favicon set has been retired alongside the rest of the
    // pre-Phase-1 brand assets — symbol.svg is designed to read on both
    // light and dark browser chrome.
    icon: { url: "/symbol.svg", type: "image/svg+xml" },
    apple: "/symbol.svg",
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://academia-vert-phi.vercel.app"
  ),
  openGraph: {
    type: "website",
    siteName: "Brightroots",
    title: "Brightroots — Learn from the best",
    description:
      "Access premium courses taught by industry experts. One subscription, unlimited learning.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Brightroots — Learn from the best",
    description:
      "Access premium courses taught by industry experts. One subscription, unlimited learning.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Resource-hint targets — extracted so we can preconnect the moment
// the HTML parses, well before React hydrates and Supabase makes its
// first call. Preconnect performs DNS + TCP + TLS in parallel with
// the rest of the page load, eliminating ~200-400ms from the first
// auth round-trip.
//
// We hardcode the Supabase URL because it's a NEXT_PUBLIC_ env that
// would otherwise be inlined by Next at build time anyway, and we
// want this resolved at HTML-parse time, not after hydration.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://axignnpghzhbirxoppyw.supabase.co";
const DAILY_DOMAIN = process.env.NEXT_PUBLIC_DAILY_DOMAIN || "brightroots";
const DAILY_ORIGIN = `https://${DAILY_DOMAIN
  .replace(/^https?:\/\//, "")
  .replace(/\.daily\.co\/?$/i, "")
  .replace(/\/$/, "")}.daily.co`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Force dark mode app-wide. Cook-OS-inspired warm-charcoal palette is
    // defined in globals.css under the combined `:root, .dark` selector.
    // `color-scheme: dark` (set in globals.css) ensures native form
    // controls (scrollbars, date pickers, etc.) match the theme without a
    // per-element override.
    <html
      lang="en"
      className={`dark ${geist.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Preconnect to Supabase — every authenticated page makes
             at least one query here. Doing the DNS+TCP+TLS handshake
             in parallel with the HTML parse saves ~200-400ms on the
             first round-trip after hydration. */}
        <link rel="preconnect" href={SUPABASE_URL} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={SUPABASE_URL} />
        {/* DNS-prefetch to Daily — warming the TCP/TLS would be
             wasteful (only session-room pages use Daily) but DNS
             resolution is cheap and saves ~20-120ms when the user
             does navigate to a session room. */}
        <link rel="dns-prefetch" href={DAILY_ORIGIN} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <LanguageProvider>
          <AuthProvider>
            <ProgressProvider>{children}</ProgressProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

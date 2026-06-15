import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";

// Typography is the native system stack (SF on Apple, Roboto/Segoe
// elsewhere) + SF Mono, declared in globals.css @theme per the Workshop
// style guide. No sans webfont for the app shell.
//
// EB Garamond (italic) loads HERE, in the Server Component layout —
// next/font must NOT be called from a "use client" module: it survives
// the Turbopack build but `garamond.variable` is undefined at runtime,
// which threw on the landing's first render. It only defines the
// --font-eb-garamond CSS var; the face downloads only where an <em>
// under [data-landing] uses it (the marketing landing), so the serif
// never ships with the product UI.
const garamond = EB_Garamond({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["400"],
  variable: "--font-eb-garamond",
  display: "swap",
});

import { LanguageProvider } from "@/lib/i18n/language-context";
import { AuthProvider } from "@/lib/auth-context";
import { ProgressProvider } from "@/lib/progress-context";
import { AppToaster } from "@/components/shared/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Visible — Learn from the best",
    template: "%s | Visible",
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
    siteName: "Visible",
    title: "Visible — Learn from the best",
    description:
      "Access premium courses taught by industry experts. One subscription, unlimited learning.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Visible — Learn from the best",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Light theme app-wide (Visible brand). The palette lives in
    // globals.css under `:root`; `color-scheme: light` (set there)
    // makes native form chrome (scrollbars, date pickers) match.
    // No `dark` class — dark mode was removed in the rebrand.
    <html
      lang="en"
      className={`${garamond.variable} h-full antialiased`}
    >
      <head>
        {/* Preconnect to Supabase — every authenticated page makes
             at least one query here. Doing the DNS+TCP+TLS handshake
             in parallel with the HTML parse saves ~200-400ms on the
             first round-trip after hydration. */}
        <link rel="preconnect" href={SUPABASE_URL} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={SUPABASE_URL} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <LanguageProvider>
          <AuthProvider>
            <ProgressProvider>{children}</ProgressProvider>
          </AuthProvider>
        </LanguageProvider>
        {/* Sonner toast container — emits floating banners for live
             events (DM arrived, session went live, etc.) when the
             notification popover is closed. */}
        <AppToaster />
      </body>
    </html>
  );
}

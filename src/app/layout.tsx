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

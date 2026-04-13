import type { Metadata } from "next";
import { Geist } from "next/font/google";

const geist = Geist({
  variable: "--font-sans",
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
    icon: [
      { url: "/favicon-light.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-dark.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/favicon-light.svg",
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
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <LanguageProvider>
          <AuthProvider>
            <ProgressProvider>{children}</ProgressProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

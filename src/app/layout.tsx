import type { Metadata } from "next";
import { Geist } from "next/font/google";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});
import { LanguageProvider } from "@/lib/i18n/language-context";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Educator — Learn from the best",
  description:
    "Access premium courses taught by industry experts. One subscription, unlimited learning.",
  icons: {
    icon: "/logo.svg",
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
          <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

import Link from "next/link";
import { Logo } from "@/components/shared/logo";

/**
 * Custom 404 page — shown when a route doesn't match any page.
 * This is a Server Component (no "use client") so it loads fast.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      {/* Logo */}
      <Link href="/" className="mb-10">
        <Logo className="h-6" />
      </Link>

      {/* 404 Badge */}
      <div className="mb-6 inline-flex items-center rounded-full border border-border px-3 py-1">
        <span className="text-xs font-medium text-muted-foreground">
          404
        </span>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Page introuvable
      </h1>

      {/* Description */}
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        La page que vous recherchez n&apos;existe pas ou a été déplacée.
        <br />
        <span className="text-muted-foreground/70">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </span>
      </p>

      {/* Actions */}
      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/courses"
          className="inline-flex h-9 items-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
        >
          Parcourir les cours
        </Link>
      </div>
    </div>
  );
}

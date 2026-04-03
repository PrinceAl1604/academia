import Link from "next/link";
import { Logo } from "@/components/shared/logo";

/**
 * Custom 404 page — shown when a route doesn't match any page.
 * This is a Server Component (no "use client") so it loads fast.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-neutral-950 px-6 text-center">
      {/* Logo */}
      <Link href="/" className="mb-10">
        <Logo className="h-6" />
      </Link>

      {/* 404 Badge */}
      <div className="mb-6 inline-flex items-center rounded-full border border-neutral-200 dark:border-neutral-800 px-3 py-1">
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          404
        </span>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
        Page introuvable
      </h1>

      {/* Description */}
      <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
        La page que vous recherchez n&apos;existe pas ou a été déplacée.
        <br />
        <span className="text-neutral-400 dark:text-neutral-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </span>
      </p>

      {/* Actions */}
      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/courses"
          className="inline-flex h-9 items-center rounded-md border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Parcourir les cours
        </Link>
      </div>
    </div>
  );
}

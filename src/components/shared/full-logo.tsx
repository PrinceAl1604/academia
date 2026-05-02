"use client";

/**
 * FullLogo — alias for Logo, kept for backward compatibility with
 * auth-page call sites (sign-in, sign-up, reset-password).
 *
 * Originally `FullLogo` and `Logo` rendered different files (FullLogo
 * always used the dark-text variant for the cream auth background;
 * Logo dual-rendered light/dark for the dashboard). With force-dark
 * + a single brand asset (`/logo.svg`), both components now point at
 * the same file. Re-exporting Logo as FullLogo so existing imports
 * keep working without renaming dozens of call sites.
 */
export { Logo as FullLogo } from "./logo";

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware — hostname routing + auth gating.
 *
 * TWO-DOMAIN SETUP
 * ----------------
 * The marketing landing and the product app are served from the SAME
 * Vercel project under two hostnames, split here by the `Host` header:
 *   • LANDING_HOST (NEXT_PUBLIC_SITE_URL) → public marketing pages only
 *   • APP_HOST     (NEXT_PUBLIC_APP_URL)  → the product (auth + app)
 *
 * Any host matching NEITHER (Vercel preview URLs, localhost) falls back
 * to single-domain behaviour — the whole app, with the landing at "/"
 * for logged-out visitors — so previews and local dev keep working.
 *
 * AUTH MODEL (app host / fallback)
 * --------------------------------
 * Only /sign-in, /sign-up, /reset-password are reachable logged-out.
 * Protected routes redirect to /sign-in; /admin additionally verifies
 * role. We skip the getUser() network call entirely for visitors with
 * no session cookie — there's nothing to verify or refresh.
 */

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

// Hardcoded fallbacks mirror the rest of the codebase (which falls back
// to the Vercel URL): production hosts resolve even if the env vars
// aren't set yet, while previews/localhost match neither and stay
// single-domain.
const LANDING_HOST =
  hostOf(process.env.NEXT_PUBLIC_SITE_URL) || "programme.workshop-visible.com";
const APP_HOST =
  hostOf(process.env.NEXT_PUBLIC_APP_URL) || "app.workshop-visible.com";
const APP_ORIGIN = (
  process.env.NEXT_PUBLIC_APP_URL || "https://app.workshop-visible.com"
).replace(/\/$/, "");

// The public marketing site. Everything else on the landing host is an
// app route and gets bounced to the app domain.
function isMarketingPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/pricing" ||
    pathname === "/privacy" ||
    pathname === "/terms"
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host");
  const response = NextResponse.next({ request });

  // ── Landing host: marketing only ─────────────────────────────────
  // Serve the marketing pages; bounce every app route to the app domain
  // (preserving path + query). No auth work — the site is fully public.
  if (host === LANDING_HOST) {
    if (isMarketingPath(pathname)) return response;
    return NextResponse.redirect(`${APP_ORIGIN}${pathname}${search}`);
  }

  const onAppHost = host === APP_HOST;

  // ── Auth routing (app host + previews/localhost) ─────────────────
  const isAuthRoute =
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname === "/reset-password";

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname === "/onboarding" ||
    (pathname.startsWith("/courses/") && pathname.endsWith("/learn"));

  const hasSessionCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  // No session cookie ⇒ nothing to verify or refresh. Decide locally,
  // never paying for getUser() (saves a 50–200ms edge round-trip on
  // every logged-out request).
  if (!hasSessionCookie) {
    if (isAuthRoute) return response;
    if (isProtectedRoute) {
      const signInUrl = new URL("/sign-in", request.url);
      if (pathname !== "/") signInUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signInUrl);
    }
    // App host: "/" is NOT the marketing page (that lives on the landing
    // host) — send logged-out visitors to sign-in. On previews/localhost
    // we let "/" render the landing so it stays testable.
    if (onAppHost && pathname === "/") {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    return response;
  }

  // Session cookie present — verify it and let the SSR client refresh
  // the token via the cookie callbacks.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Cookie present but token invalid/expired and unrefreshable.
  if (!user) {
    if (isProtectedRoute) {
      const signInUrl = new URL("/sign-in", request.url);
      if (pathname !== "/") signInUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signInUrl);
    }
    if (onAppHost && pathname === "/") {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    return response;
  }

  // SECURITY: anchor admin gating on app_metadata.role (server-only
  // writable), never user_metadata.role (client-writable).
  const metaRole = (user.app_metadata as Record<string, unknown> | null)?.role;

  // Authenticated user on an auth route → bounce to their home.
  if (isAuthRoute) {
    if (metaRole === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Authenticated admin on the home page → /admin.
  if (pathname === "/" && metaRole === "admin") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // /admin/* — verify admin role (JWT fast path, DB fallback).
  if (pathname.startsWith("/admin")) {
    if (metaRole === "admin") return response;

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except API routes, the auth callback, Next
    // internals, and static files (anything with a dot). Broad coverage
    // is required so app routes hit on the landing host get redirected
    // to the app domain.
    "/((?!api|auth|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware — runs on every matched request before the page renders.
 *
 * Auth model: only /sign-in, /sign-up, /reset-password are reachable
 * without a session. Everything else under the matcher (including
 * the catalog at "/") requires auth — logged-out visitors are
 * redirected to /sign-in so we can layer in a proper marketing
 * landing page later without conflating it with the student home.
 *
 * Perf shape: cookie-sniff first, getUser() only when needed.
 *  1. `supabase.auth.getUser()` is a NETWORK call to Supabase auth.
 *     On a cold edge it costs 50–200ms.
 *  2. Presence of an sb-*-auth-token cookie is a sufficient gate
 *     for the most common case (no cookie ⇒ no session). We only
 *     pay for getUser() when there's actually a token to verify.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request });

  // Auth pages — anyone can reach them (signed in or not).
  const isAuthRoute =
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname === "/reset-password";

  // Explicit protected-route list. This duplicates the `matcher` at
  // the bottom of the file by design: if a new path gets added to
  // the matcher without updating this list, the route falls through
  // to "no decision" (no redirect, no protection) — fail-closed by
  // omission rather than fail-open via `!isAuthRoute`. Reviewable
  // here in one place instead of mentally re-deriving from the
  // matcher pattern on every read.
  const isProtectedRoute =
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname === "/onboarding" ||
    (pathname.startsWith("/courses/") && pathname.endsWith("/learn"));

  // Cheap cookie sniff: does the visitor look authenticated at all?
  const hasSessionCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  // Fast path 1: logged-out visitor on an auth page — let them in,
  // no network call.
  if (!hasSessionCookie && isAuthRoute) {
    return response;
  }

  // Fast path 2: logged-out visitor on a protected page — redirect
  // locally, no network call. Includes "/" now.
  if (!hasSessionCookie && isProtectedRoute) {
    const signInUrl = new URL("/sign-in", request.url);
    if (pathname !== "/") signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Slow path: there is a session cookie, so we need to verify it
  // and (importantly) let the SSR client refresh the token via the
  // cookie callbacks. This is the only path that pays for getUser().
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

  // Cookie present but token invalid/expired and unrefreshable —
  // treat as unauthenticated.
  if (!user) {
    if (isProtectedRoute) {
      const signInUrl = new URL("/sign-in", request.url);
      if (pathname !== "/") signInUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signInUrl);
    }
    return response;
  }

  // SECURITY: anchor admin gating on app_metadata.role, not
  // user_metadata.role. user_metadata is client-writable via
  // supabase.auth.updateUser({ data: ... }) — a regular user can
  // self-elevate by writing { role: "admin" } to their own metadata
  // and bypass this middleware. app_metadata is server-only writable
  // (must use the service-role admin client). Backfilled from
  // public.users.role in the `app_metadata_role_backfill` migration.
  const metaRole = (user.app_metadata as Record<string, unknown> | null)?.role;

  // Authenticated user on auth route → bounce to their home.
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

  // /admin/* — verify admin role. JWT-cached path is fast; DB
  // fallback covers users whose app_metadata isn't populated yet
  // (legacy accounts pre-backfill).
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

    // DB says admin but JWT app_metadata isn't flagged — this is a
    // post-promotion case. We can't update app_metadata from a
    // non-admin Supabase client (would need service role). The next
    // sign-in or token refresh after admin runs the backfill SQL
    // again will pick it up; no-op here.
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/admin/:path*",
    "/sign-in",
    "/sign-up",
    "/reset-password",
    "/courses/:slug/learn",
    "/onboarding",
  ],
};

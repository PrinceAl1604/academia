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

  // Everything else under the matcher requires auth. The catalog
  // at "/" used to be public; now it's the post-login student home.
  // Logged-out visitors are sent to /sign-in so we can build a
  // proper landing page later without conflating the two.
  const isProtectedRoute = !isAuthRoute;

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

  const metaRole = user.user_metadata?.role;

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

  // /admin/* — verify admin role.
  if (pathname.startsWith("/admin")) {
    if (metaRole === "admin") {
      // JWT-cached role; no DB call.
      return response;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Cache role in user_metadata so future requests skip the DB hit.
    supabase.auth.updateUser({ data: { role: "admin" } }).catch(() => {});
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

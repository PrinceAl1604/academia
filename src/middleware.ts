import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware — runs on every matched request before the page renders.
 *
 * Perf-critical path. Two observations drove the current shape:
 *
 *  1. `supabase.auth.getUser()` is a NETWORK call to Supabase auth.
 *     On a cold edge it costs 50–200ms. We only want to pay that
 *     when there's actually a session to verify.
 *  2. Auth routes (/sign-in, /sign-up, /reset-password) and the home
 *     page are visited far more often without a session than with
 *     one. For those, presence of an sb-*-auth-token cookie is a
 *     sufficient gate — no cookie means no session, redirect logic
 *     is a no-op, return immediately.
 *
 * So: cookie-sniff first, getUser() only when needed.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request });

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/courses/") ||
    pathname === "/onboarding";
  const isAuthRoute =
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname === "/reset-password";

  // Cheap cookie sniff: does the visitor look authenticated at all?
  const hasSessionCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  // Fast path 1: unauthenticated visitor on a public/auth route — no
  // work needed, no network call.
  if (!hasSessionCookie && (isAuthRoute || pathname === "/")) {
    return response;
  }

  // Fast path 2: unauthenticated visitor on a protected route —
  // redirect locally, no network call.
  if (!hasSessionCookie && isProtectedRoute) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
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
      signInUrl.searchParams.set("redirect", pathname);
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

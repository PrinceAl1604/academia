import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware — runs on EVERY matched request before it hits the page.
 *
 * Responsibilities:
 * 1. Refresh auth session (keep cookies fresh)
 * 2. Redirect unauthenticated users away from /dashboard and /admin
 * 3. Redirect authenticated users away from /sign-in and /sign-up
 * 4. Verify admin role for /admin routes (using cached role from user_metadata)
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

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

  // Refresh session — this is critical for keeping the auth token alive
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ─── Protected routes: require authentication ─────────────────
  const isProtectedRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname === "/onboarding";

  if (isProtectedRoute && !user) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // ─── Auth routes: redirect logged-in users to dashboard ───────
  const isAuthRoute =
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname === "/reset-password";

  if (isAuthRoute && user) {
    // Send admins to /admin, students to home page
    const metaRole = user.user_metadata?.role;
    if (metaRole === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // ─── Home page: redirect admins to /admin ────────────────────
  if (pathname === "/" && user) {
    const metaRole = user.user_metadata?.role;
    if (metaRole === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  // ─── Admin routes: verify admin role ──────────────────────────
  // First try user_metadata (fast, no DB call), then fallback to DB query
  if (pathname.startsWith("/admin") && user) {
    const metaRole = user.user_metadata?.role;

    if (metaRole === "admin") {
      // Trusted — role is cached in JWT metadata
      return response;
    }

    // Fallback: check DB (only happens on first admin visit or if metadata not set)
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Cache role in user_metadata for future requests (non-blocking)
    supabase.auth.updateUser({ data: { role: "admin" } }).catch(() => {});
  }

  return response;
}

/**
 * Only run middleware on app routes, not on static files or API routes.
 * API routes handle their own auth via validateUserAccess().
 */
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

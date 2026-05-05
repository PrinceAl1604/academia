import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/auth/sign-out
 *
 * Server-side sign-out + redirect to /sign-in. Belt-and-suspenders
 * over the client `supabase.auth.signOut()` call: useful for
 * recovering from a stuck state where local React state says
 * "logged out" but the sb-*-auth-token cookies are still valid,
 * which causes middleware to redirect every /sign-in attempt
 * back to "/" (the "authed user on auth route" rule).
 *
 * Visiting this URL once clears the cookies via Set-Cookie and
 * lands on /sign-in cleanly. Linked from places where the client
 * needs to escape that loop without DevTools.
 *
 * Idempotent — calling this with no session is a no-op redirect.
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/sign-in", request.url));
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
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  await supabase.auth.signOut().catch(() => {
    // If revocation fails, the redirect still fires. Cookies have
    // already been overwritten with empty values by signOut's
    // setAll callback (above).
  });
  return response;
}

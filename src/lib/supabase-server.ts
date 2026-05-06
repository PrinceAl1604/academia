import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Admin client — uses service_role key, bypasses RLS.
 * Use ONLY in API routes / server actions for privileged operations.
 *
 * Module-scope singleton: the service-role client doesn't carry
 * per-request state (no cookies, no auth header swap), so a new
 * client per call burned an HTTP/2 connection setup, a fetch agent,
 * and ~5ms of v8 alloc on every invocation. With multiple admin
 * calls per request (validateUserAccess + the route's own queries)
 * that compounded fast. One client, lazily instantiated, reused
 * across every warm request in the function instance.
 */
let cachedAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;
  cachedAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        // Service-role token never refreshes and we never want it to
        // accidentally pick up a user session from cookies. Belt &
        // braces.
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
  return cachedAdmin;
}

/**
 * Server client — respects RLS, tied to the current user's session.
 * Use in Server Components and API routes for user-scoped queries.
 */
export async function getSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

/**
 * Validate the current user's session and subscription status.
 * Returns user info + Pro status based on server-side DB check.
 *
 * This is the SINGLE SOURCE OF TRUTH for Pro access — never trust
 * the client-side `isPro` flag for gating content.
 */
export async function validateUserAccess() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authenticated: false, user: null, isPro: false, isAdmin: false };
  }

  // Use admin client to read user profile (bypasses RLS)
  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("users")
    .select("role, subscription_tier, pro_expires_at")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { authenticated: true, user, isPro: false, isAdmin: false };
  }

  const isAdmin = profile.role === "admin";

  const hasValidPro = checkProValidity(
    profile.subscription_tier,
    profile.pro_expires_at,
    isAdmin
  );

  return {
    authenticated: true,
    user,
    isPro: hasValidPro,
    isAdmin,
    proExpiresAt: profile.pro_expires_at,
  };
}

/**
 * Check if a user's Pro subscription is currently valid.
 * This is the SINGLE SOURCE OF TRUTH — strict approach:
 *   - Admin always gets Pro (they own the platform)
 *   - Free tier = no access
 *   - Pro tier requires a valid, non-expired date
 *   - No grace period
 */
function checkProValidity(
  tier: string,
  expiresAt: string | null,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  if (tier !== "pro") return false;
  if (!expiresAt) return false;
  return new Date(expiresAt) > new Date();
}

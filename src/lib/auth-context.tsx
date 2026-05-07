"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

type Role = "user" | "admin" | null;
type Plan = "free" | "pro";

/* ─── Profile cache (localStorage) ─────────────────────────────
 * The role/plan/has_onboarded fields rarely change. Without this
 * cache, every page load forced a Supabase round-trip (~200-400ms)
 * before consumers could decide what to render. With it, returning
 * users see their fully-hydrated state in <50ms — the network
 * refresh happens in the background.
 *
 * Stale-while-revalidate semantics: we always serve cached values
 * instantly, then refresh from the server. If the server returns
 * different values, state updates and any UI relying on it
 * re-renders. Worst case is a 1-frame flash if role changed
 * server-side (e.g., admin demoted user) — acceptable trade-off
 * for the perceived perf win.
 *
 * Versioned key (`_v2`) lets us invalidate stale cache shapes when
 * the schema changes. Bump the suffix on schema migrations.
 */
// Bumped to v4 to invalidate caches that don't yet have the new
// avatarUrl field (older entries would deserialize with avatarUrl
// undefined and the topbar would briefly show initials before the
// background refresh filled it in — minor flicker but worth a clean
// cut). Previous bump (v3) was for the AdminLayout black-screen
// incident; the layout itself is now fine, but historical cache
// versions are a one-line cost so we keep the suffix for the
// schema-change pattern.
const PROFILE_CACHE_KEY = "brightroots_profile_v4";

interface CachedProfile {
  userId: string;
  role: Role;
  plan: Plan;
  proExpiresAt: string | null;
  hasOnboarded: boolean;
  referralCode: string | null;
  avatarUrl: string | null;
  cachedAt: number;
}

function readProfileCache(): CachedProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedProfile;
  } catch {
    return null;
  }
}

function writeProfileCache(profile: Omit<CachedProfile, "cachedAt">) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PROFILE_CACHE_KEY,
      JSON.stringify({ ...profile, cachedAt: Date.now() })
    );
  } catch {
    // Quota / private mode — non-fatal.
  }
}

/**
 * Pre-warm the profile cache from outside AuthProvider. Used by the
 * sign-in flow so the redirect lands on a page that hydrates from
 * cache instead of waiting on a profile round-trip.
 */
export async function primeProfileCacheForUser(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("users")
    .select("role, subscription_tier, pro_expires_at, has_onboarded, referral_code, avatar_url")
    .eq("id", userId)
    .single();
  if (error || !data) return;
  const userRole = ((data.role as Role) || "user");
  let resolvedPlan: Plan = "free";
  if (data.subscription_tier === "pro" && data.pro_expires_at) {
    const expiresAt = new Date(data.pro_expires_at);
    resolvedPlan = expiresAt > new Date() || userRole === "admin" ? "pro" : "free";
  } else if (data.subscription_tier === "pro") {
    resolvedPlan = "pro";
  }
  writeProfileCache({
    userId,
    role: userRole,
    plan: resolvedPlan,
    proExpiresAt: data.pro_expires_at || null,
    hasOnboarded: data.has_onboarded ?? true,
    referralCode: data.referral_code || null,
    avatarUrl: data.avatar_url || null,
  });
}

function clearProfileCache() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // ignore
  }
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  role: Role;
  plan: Plan;
  isPro: boolean;
  userName: string | null;
  loading: boolean;
  proExpiresAt: string | null;
  daysUntilExpiry: number | null;
  isExpiringSoon: boolean; // true if < 5 days left
  isExpired: boolean;
  hasOnboarded: boolean;
  referralCode: string | null;
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
  markOnboarded: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role>(null);
  const [plan, setPlan] = useState<Plan>("free");
  const [proExpiresAt, setProExpiresAt] = useState<string | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState(true); // default true to avoid flash redirect
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const router = useRouter();
  // Track whether we've already updated last_active_at this session.
  // Without this, every loadUserProfile call (initial load + token
  // refreshes) fires a redundant write — cheap but noisy.
  const lastActiveBeaconSent = useRef(false);

  const loadUserProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("role, subscription_tier, pro_expires_at, has_onboarded, referral_code, avatar_url")
      .eq("id", userId)
      .single();

    // last_active_at — fire-and-forget, deferred to next idle frame
    // so it never competes with render. Throttled to once per page
    // session so we don't spam writes on every token refresh.
    if (!lastActiveBeaconSent.current) {
      lastActiveBeaconSent.current = true;
      const beaconRunner = () => {
        supabase
          .from("users")
          .update({ last_active_at: new Date().toISOString() })
          .eq("id", userId)
          .then(() => {});
      };
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        (window as Window & {
          requestIdleCallback: (cb: () => void) => void;
        }).requestIdleCallback(beaconRunner);
      } else {
        setTimeout(beaconRunner, 0);
      }
    }


    // If user doesn't exist in users table, render with safe defaults
    // and let the server backfill the row.
    //
    // Two independent server paths reliably create the public.users
    // row on first sign-in:
    //   1. The handle_new_user() trigger on auth.users insert.
    //   2. The /auth/callback route's explicit admin-client insert.
    //
    // We previously had a third path here that did a client-side
    // INSERT with role + subscription_tier. After Batch 4 locked
    // those columns from the authenticated role's column grants,
    // this client insert silently fails (Supabase swallows
    // permission-denied) — but the server paths above keep the row
    // creation reliable, so functionally nothing changes. Removing
    // the dead INSERT to stop the wasted round-trip and the RLS
    // denial in Supabase logs.
    if (error && error.code === "PGRST116") {
      setRole("user");
      setPlan("free");
      setHasOnboarded(false);
      setReferralCode(null);
      setAvatarUrl(null);
      writeProfileCache({
        userId,
        role: "user",
        plan: "free",
        proExpiresAt: null,
        hasOnboarded: false,
        referralCode: null,
        avatarUrl: null,
      });
      return;
    }

    if (data && !error) {
      const userRole = (data.role as Role) || "user";
      setRole(userRole);
      setProExpiresAt(data.pro_expires_at || null);
      setHasOnboarded(data.has_onboarded ?? true);
      setReferralCode(data.referral_code || null);
      setAvatarUrl(data.avatar_url || null);

      let resolvedPlan: Plan = "free";
      // Check if Pro has expired (UI-only — DB trigger handles the
      // actual subscription_tier flip).
      //
      // Previously this block also fired a client-side
      // `update users set subscription_tier='free'`. After Batch 4
      // locked that column from the authenticated role's grants,
      // the update silently fails. The check_and_downgrade_pro
      // BEFORE-UPDATE trigger on the users table handles the actual
      // downgrade transparently on the next legitimate row update
      // (e.g. last_active_at touch on the next page load), so the DB
      // converges without the broken client write.
      if (data.subscription_tier === "pro" && data.pro_expires_at) {
        const expiresAt = new Date(data.pro_expires_at);
        if (expiresAt < new Date() && userRole !== "admin") {
          setPlan("free");
          resolvedPlan = "free";
        } else {
          setPlan("pro");
          resolvedPlan = "pro";
        }
      } else {
        const p = (data.subscription_tier as Plan) || "free";
        setPlan(p);
        resolvedPlan = p;
      }

      // Persist fresh profile to localStorage so the next page load
      // hydrates instantly (skip the network round-trip on mount).
      writeProfileCache({
        userId,
        role: userRole,
        plan: resolvedPlan,
        proExpiresAt: data.pro_expires_at || null,
        hasOnboarded: data.has_onboarded ?? true,
        referralCode: data.referral_code || null,
        avatarUrl: data.avatar_url || null,
      });
    } else {
      setRole("user");
      setPlan("free");
    }
  }, []);

  useEffect(() => {
    // `cancelled` guards against React Strict Mode double-mounts and
    // user-changes-route-during-fetch races. Without it, a stale
    // resolution from an old session can overwrite the new one.
    let cancelled = false;

    // Safety net: never let `loading` stay true beyond 2.5s. The
    // bootstrap path normally reaches setLoading(false) via cache hit
    // (~50ms) or loadUserProfile (~200-400ms), but a slow users-table
    // query (RLS planner, cold edge node, network jitter) can stretch
    // that into multi-second territory. Gating the entire app — most
    // visibly AdminLayout's full-screen spinner — on that one query
    // is worse UX than rendering with default role/plan and letting
    // the network resolution refine state in the background.
    const loadingSafetyTimer = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 2500);

    // ─── PERF: stale-while-revalidate auth bootstrap ─────────────
    // Critical optimization: the previous flow awaited TWO Supabase
    // round-trips (getSession then loadUserProfile, ~500-800ms total)
    // before consumers could decide what to render. Admin layouts
    // showed a spinner the whole time.
    //
    // New flow exploits two facts:
    //   1. supabase.auth.getSession() reads from localStorage and
    //      returns synchronously — no network call.
    //   2. role/plan rarely change, so cached values from the last
    //      page load are reliable enough to render with.
    //
    // We hydrate state from cache instantly (loading=false in <50ms),
    // then refresh from the network in the background. If the
    // refresh returns different values, state updates and the UI
    // re-renders — typical "stale-while-revalidate" pattern.
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (!session?.user) {
          setLoading(false);
          return;
        }

        setUser(session.user);

        // Try cache hit — instant render path.
        const cached = readProfileCache();
        if (cached && cached.userId === session.user.id) {
          setRole(cached.role);
          setPlan(cached.plan);
          setProExpiresAt(cached.proExpiresAt);
          setHasOnboarded(cached.hasOnboarded);
          setReferralCode(cached.referralCode);
          setAvatarUrl(cached.avatarUrl ?? null);
          setLoading(false);
          // PERF: skip the background refresh entirely if the cache is
          // less than 5 minutes old. Saves ~150-300ms of network on
          // every page navigation for active users. Stale cache
          // updates will catch up on the NEXT page load past the TTL.
          const PROFILE_FRESH_MS = 5 * 60 * 1000;
          if (Date.now() - cached.cachedAt < PROFILE_FRESH_MS) {
            return; // cache is fresh; no network call needed
          }
          // Background refresh — discrepancies update state via setters.
          // We don't await; perceived load is already complete.
          loadUserProfile(session.user.id).catch(() => {});
          return;
        }

        // Cache miss — first-time login or cleared cache. Wait for
        // network (no choice) but at least we have the user object
        // set so the navbar can render the avatar / email
        // immediately.
        await loadUserProfile(session.user.id);
      } catch (err) {
        // Never let an unhandled rejection from getSession() or
        // loadUserProfile() leave the app stuck on the spinner. The
        // safety timer above also catches this, but failing fast is
        // better when the failure is deterministic.
        console.error("[AuthProvider] bootstrap failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
        // INITIAL_SESSION fires on subscribe and duplicates the
        // bootstrap above — skip it. TOKEN_REFRESHED happens hourly
        // and only swaps the JWT — role/plan/onboarded values can't
        // change just because a token rotated, so reading the user
        // table again would be pure waste. USER_UPDATED is the
        // explicit signal that user_metadata changed, so we DO let
        // that one through.
        if (event === "INITIAL_SESSION") return;
        if (event === "TOKEN_REFRESHED") {
          setUser(session?.user ?? null);
          return;
        }
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          // Sign out — clear cache so a different user signing in
          // on this device doesn't briefly see the previous user's
          // role.
          clearProfileCache();
          lastActiveBeaconSent.current = false;
          setRole(null);
          setPlan("free");
          setProExpiresAt(null);
          setAvatarUrl(null);
        }
        if (cancelled) return;
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(loadingSafetyTimer);
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  const markOnboarded = useCallback(() => {
    setHasOnboarded(true);
  }, []);

  const logout = useCallback(async () => {
    // Optimistic state clear so the UI updates instantly.
    clearProfileCache();
    lastActiveBeaconSent.current = false;
    setUser(null);
    setRole(null);
    setPlan("free");
    setProExpiresAt(null);
    setHasOnboarded(true);
    setReferralCode(null);
    setAvatarUrl(null);

    // CRITICAL: must AWAIT signOut() before navigating. The browser
    // client clears the sb-*-auth-token cookies as part of signOut.
    // If we navigate first, middleware sees the still-valid cookie,
    // verifies the user, and redirects /sign-in → / (the "authed
    // user on auth route" rule). The user gets stuck on the catalog
    // with logged-out client state and no way to reach /sign-in.
    try {
      await supabase.auth.signOut();
    } catch {
      // Network failure — fall through to the manual cookie wipe
      // below so the user isn't trapped if Supabase is unreachable.
    }

    // Belt-and-suspenders: clear any lingering sb-* cookies on the
    // current document. Covers cases where signOut() resolved but
    // the cookie clear didn't propagate, or signOut threw before
    // the network call completed.
    if (typeof document !== "undefined") {
      const expire = "expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      document.cookie.split(";").forEach((c) => {
        const eq = c.indexOf("=");
        const name = (eq > -1 ? c.substr(0, eq) : c).trim();
        if (name.startsWith("sb-")) {
          document.cookie = `${name}=;${expire}`;
        }
      });
    }

    // Land on /sign-in — "/" is the post-login student home, so
    // sending freshly-logged-out users there would just bounce them
    // through middleware back to /sign-in anyway.
    router.replace("/sign-in");
  }, [router]);

  // PERF: stabilize on the few fields we actually read, NOT the full
  // user object — Supabase rebuilds `user` on every TOKEN_REFRESHED
  // event (~hourly), and a `[user]` dep would re-trigger every memo
  // and child re-render in the tree.
  const userName = useMemo(
    () =>
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      null,
    [user?.user_metadata?.full_name, user?.email]
  );

  // Same trick for the user object exposed via context — only swap
  // identity when user.id, role-in-metadata, name, or email change.
  // Stops downstream consumers from re-rendering on every token tick.
  const stableUser = useMemo(
    () => user,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, user?.email, user?.user_metadata?.role, user?.user_metadata?.full_name]
  );

  // Memoize expensive calculations
  const daysUntilExpiry = useMemo(
    () =>
      proExpiresAt
        ? Math.ceil((new Date(proExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
    [proExpiresAt]
  );

  const isExpiringSoon = useMemo(
    () => daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 5,
    [daysUntilExpiry]
  );

  const isExpired = useMemo(
    () => daysUntilExpiry !== null && daysUntilExpiry <= 0 && role !== "admin",
    [daysUntilExpiry, role]
  );

  // Optimistic setter exposed to settings page after a successful
  // upload — flips the local state immediately so the topbar avatar
  // updates without waiting on the next loadUserProfile cycle. Also
  // patches the localStorage cache so the new image survives a hard
  // refresh.
  const updateAvatarUrl = useCallback((url: string | null) => {
    setAvatarUrl(url);
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CachedProfile;
      window.localStorage.setItem(
        PROFILE_CACHE_KEY,
        JSON.stringify({ ...parsed, avatarUrl: url })
      );
    } catch {
      // ignore — non-fatal, next loadUserProfile will reconcile
    }
  }, []);

  // Memoize context value to prevent unnecessary re-renders of consumers.
  // Note: `user` is replaced with `stableUser` so token refreshes don't
  // churn the whole tree.
  const contextValue = useMemo<AuthContextType>(
    () => ({
      user: stableUser,
      isAuthenticated: !!stableUser,
      isAdmin: role === "admin",
      role,
      plan: isExpired ? "free" : plan,
      isPro: isExpired ? false : plan === "pro",
      userName,
      loading,
      proExpiresAt,
      daysUntilExpiry,
      isExpiringSoon,
      isExpired,
      hasOnboarded,
      referralCode,
      avatarUrl,
      setAvatarUrl: updateAvatarUrl,
      markOnboarded,
      logout,
    }),
    [stableUser, role, plan, userName, loading, proExpiresAt, daysUntilExpiry, isExpiringSoon, isExpired, hasOnboarded, referralCode, avatarUrl, updateAvatarUrl, markOnboarded, logout]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

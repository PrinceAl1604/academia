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
const PROFILE_CACHE_KEY = "brightroots_profile_v2";

interface CachedProfile {
  userId: string;
  role: Role;
  plan: Plan;
  proExpiresAt: string | null;
  hasOnboarded: boolean;
  referralCode: string | null;
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
  const router = useRouter();
  // Track whether we've already updated last_active_at this session.
  // Without this, every loadUserProfile call (initial load + token
  // refreshes) fires a redundant write — cheap but noisy.
  const lastActiveBeaconSent = useRef(false);

  const loadUserProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("role, subscription_tier, pro_expires_at, has_onboarded, referral_code")
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


    // If user doesn't exist in users table, create them
    if (error && error.code === "PGRST116") {
      const session = (await supabase.auth.getSession()).data.session;
      const meta = session?.user?.user_metadata;
      await supabase.from("users").insert({
        id: userId,
        email: session?.user?.email || "",
        name: meta?.full_name || session?.user?.email?.split("@")[0] || "",
        role: "student",
        subscription_tier: "free",
      });
      setRole("user");
      setPlan("free");
      setHasOnboarded(false);
      setReferralCode(null);
      writeProfileCache({
        userId,
        role: "user",
        plan: "free",
        proExpiresAt: null,
        hasOnboarded: false,
        referralCode: null,
      });
      return;
    }

    if (data && !error) {
      const userRole = (data.role as Role) || "user";
      setRole(userRole);
      setProExpiresAt(data.pro_expires_at || null);
      setHasOnboarded(data.has_onboarded ?? true);
      setReferralCode(data.referral_code || null);

      let resolvedPlan: Plan = "free";
      // Check if Pro has expired
      if (data.subscription_tier === "pro" && data.pro_expires_at) {
        const expiresAt = new Date(data.pro_expires_at);
        if (expiresAt < new Date() && userRole !== "admin") {
          // Pro expired — downgrade to free
          setPlan("free");
          resolvedPlan = "free";
          await supabase
            .from("users")
            .update({ subscription_tier: "free" })
            .eq("id", userId);
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
      // network (no choice) but at least we have the user object set
      // so the navbar can render the avatar / email immediately.
      await loadUserProfile(session.user.id);
      if (cancelled) return;
      setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
        // INITIAL_SESSION fires on subscribe and duplicates the
        // bootstrap above — skip it. Only react to actual auth
        // changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.).
        if (event === "INITIAL_SESSION") return;
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
        }
        if (cancelled) return;
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  const markOnboarded = useCallback(() => {
    setHasOnboarded(true);
  }, []);

  const logout = useCallback(async () => {
    // Optimistic state clear so the UI updates instantly. The actual
    // network signOut fires in the background — users perceive logout
    // as immediate even though the JWT revocation takes 200-500ms.
    // If signOut() fails the worst case is a stale local session that
    // will fail-and-redirect on the next API call, which is fine.
    clearProfileCache();
    lastActiveBeaconSent.current = false;
    setUser(null);
    setRole(null);
    setPlan("free");
    setProExpiresAt(null);
    setHasOnboarded(true);
    setReferralCode(null);
    router.push("/");
    supabase.auth.signOut().catch(() => {
      // intentionally swallowed — local state already cleared
    });
  }, [router]);

  const userName = useMemo(
    () =>
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      null,
    [user]
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

  // Memoize context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: !!user,
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
      markOnboarded,
      logout,
    }),
    [user, role, plan, userName, loading, proExpiresAt, daysUntilExpiry, isExpiringSoon, isExpired, hasOnboarded, referralCode, markOnboarded, logout]
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

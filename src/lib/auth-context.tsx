"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

type Role = "user" | "admin" | null;
type Plan = "free" | "pro";

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

  const loadUserProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("role, subscription_tier, pro_expires_at, has_onboarded, referral_code")
      .eq("id", userId)
      .single();

    // Update last_active_at (non-blocking, for inactive nudge emails)
    supabase
      .from("users")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", userId)
      .then(() => {});


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
      return;
    }

    if (data && !error) {
      const userRole = (data.role as Role) || "user";
      setRole(userRole);
      setProExpiresAt(data.pro_expires_at || null);
      setHasOnboarded(data.has_onboarded ?? true);
      setReferralCode(data.referral_code || null);

      // Check if Pro has expired
      if (data.subscription_tier === "pro" && data.pro_expires_at) {
        const expiresAt = new Date(data.pro_expires_at);
        if (expiresAt < new Date() && userRole !== "admin") {
          // Pro expired — downgrade to free
          setPlan("free");
          await supabase
            .from("users")
            .update({ subscription_tier: "free" })
            .eq("id", userId);
        } else {
          setPlan("pro");
        }
      } else {
        setPlan((data.subscription_tier as Plan) || "free");
      }
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

    // CRITICAL: await loadUserProfile BEFORE flipping loading=false.
    // The previous code fired the profile fetch and set loading=false
    // immediately, so admin-only layouts saw isAdmin=false (role
    // hadn't loaded yet) and redirected to "/" — students would see
    // their dashboard for ~300ms before the role resolved as admin.
    // Now consumers don't see anything until role/plan are reliable.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserProfile(session.user.id);
      }
      if (cancelled) return;
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
        // INITIAL_SESSION fires on subscribe and would duplicate the
        // getSession() above — wasted query + potential race. Skip it.
        if (event === "INITIAL_SESSION") return;
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
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

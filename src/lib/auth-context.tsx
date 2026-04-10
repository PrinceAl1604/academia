"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          loadUserProfile(session.user.id);
        } else {
          setRole(null);
          setPlan("free");
          setProExpiresAt(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Middleware handles redirecting authenticated users away from auth routes.
  // No client-side redirect needed here.

  const loadUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("role, subscription_tier, pro_expires_at, has_onboarded")
      .eq("id", userId)
      .single();

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
      return;
    }

    if (data && !error) {
      const userRole = (data.role as Role) || "user";
      setRole(userRole);
      setProExpiresAt(data.pro_expires_at || null);
      setHasOnboarded(data.has_onboarded ?? true);

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
  };

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setPlan("free");
    setProExpiresAt(null);
    setHasOnboarded(true);
    router.push("/");
  }, [router]);

  const userName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    null;

  // Calculate days until expiry
  const daysUntilExpiry = proExpiresAt
    ? Math.ceil((new Date(proExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 5;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0 && role !== "admin";

  return (
    <AuthContext.Provider
      value={{
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
        logout,
      }}
    >
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

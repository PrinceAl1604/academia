"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Routes that require NO auth (public pages)
const AUTH_ROUTES = ["/sign-in", "/sign-up", "/reset-password", "/auth/callback"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role>(null);
  const [plan, setPlan] = useState<Plan>("free");
  const router = useRouter();
  const pathname = usePathname();

  // Listen to auth state changes
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
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Redirect logged-in users away from auth pages
  useEffect(() => {
    if (loading) return;
    const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

    if (user && isAuthRoute) {
      router.push("/");
    }
  }, [user, loading, pathname, router]);

  const loadUserProfile = async (userId: string) => {
    // Fetch role and plan from the users table in Supabase
    const { data, error } = await supabase
      .from("users")
      .select("role, subscription_tier")
      .eq("id", userId)
      .single();

    if (data && !error) {
      setRole((data.role as Role) || "user");
      setPlan((data.subscription_tier as Plan) || "free");
    } else {
      // User not in users table yet — default to free student
      setRole("user");
      setPlan("free");
    }
  };

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setPlan("free");
    router.push("/");
  }, [router]);

  const userName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: role === "admin",
        role,
        plan,
        isPro: plan === "pro",
        userName,
        loading,
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

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

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  role: Role;
  userName: string | null;
  isActivated: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  activateLicenceKey: (key: string) => Promise<{ success: boolean; error?: string }>;
  // Legacy compat
  showLicenceModal: boolean;
  openLicenceModal: () => void;
  dismissModal: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PUBLIC_ROUTES = ["/sign-in", "/sign-up", "/reset-password", "/auth/callback", "/privacy", "/terms"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role>(null);
  const [isActivated, setIsActivated] = useState(false);
  const [showLicenceModal, setShowLicenceModal] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Listen to auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserRole(session.user.id);
      }
      setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          loadUserRole(session.user.id);
        } else {
          setRole(null);
          setIsActivated(false);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Redirect logic
  useEffect(() => {
    if (loading) return;

    const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

    if (!user && !isPublicRoute) {
      router.push("/sign-in");
    } else if (user && (pathname === "/sign-in" || pathname === "/sign-up")) {
      router.push("/");
    }
  }, [user, loading, pathname, router]);

  const loadUserRole = async (userId: string) => {
    // Check if user has an activated licence key
    const storedRole = localStorage.getItem("academia-role");
    const storedActivated = localStorage.getItem("academia-licence");

    if (storedActivated === "activated") {
      setIsActivated(true);
      setRole((storedRole as Role) || "user");
    }
  };

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("academia-licence");
    localStorage.removeItem("academia-role");
    localStorage.removeItem("academia-user");
    localStorage.removeItem("academia-licence-value");
    setUser(null);
    setRole(null);
    setIsActivated(false);
    router.push("/sign-in");
  }, [router]);

  const activateLicenceKey = useCallback(
    async (key: string): Promise<{ success: boolean; error?: string }> => {
      const trimmed = key.trim();
      if (trimmed.length < 4) {
        return { success: false, error: "Invalid licence key" };
      }

      // Validate against Supabase database
      const { data, error } = await supabase
        .from("licence_keys")
        .select("*")
        .eq("key", trimmed)
        .eq("status", "active")
        .single();

      if (error || !data) {
        return {
          success: false,
          error: "Invalid or expired licence key. Please try again.",
        };
      }

      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { success: false, error: "This licence key has expired." };
      }

      const detectedRole = data.type === "admin" ? "admin" : "user";

      setIsActivated(true);
      setRole(detectedRole);
      setShowLicenceModal(false);

      localStorage.setItem("academia-licence", "activated");
      localStorage.setItem("academia-role", detectedRole);
      localStorage.setItem("academia-licence-value", trimmed);

      return { success: true };
    },
    []
  );

  const userName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    null;

  const openLicenceModal = useCallback(() => setShowLicenceModal(true), []);
  const dismissModal = useCallback(() => setShowLicenceModal(false), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: role === "admin",
        role,
        userName,
        isActivated,
        loading,
        logout,
        activateLicenceKey,
        showLicenceModal,
        openLicenceModal,
        dismissModal,
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

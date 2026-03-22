"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";

type Role = "user" | "admin" | null;

interface AuthContextType {
  isActivated: boolean;
  role: Role;
  isAdmin: boolean;
  userName: string | null;
  activate: (key: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  showLicenceModal: boolean;
  openLicenceModal: () => void;
  dismissModal: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "academia-licence";
const ROLE_KEY = "academia-role";
const USER_KEY = "academia-user";
const LICENCE_VAL_KEY = "academia-licence-value";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isActivated, setIsActivated] = useState(false);
  const [role, setRole] = useState<Role>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [showLicenceModal, setShowLicenceModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load activation state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedRole = localStorage.getItem(ROLE_KEY) as Role;
    const savedUser = localStorage.getItem(USER_KEY);
    if (saved === "activated") {
      setIsActivated(true);
      setRole(savedRole || "user");
      setUserName(savedUser);
    }
    setMounted(true);
  }, []);

  // Auto-show modal after 3 seconds if not activated
  useEffect(() => {
    if (!mounted || isActivated) return;

    const timer = setTimeout(() => {
      setShowLicenceModal(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [mounted, isActivated]);

  const activate = useCallback(
    async (
      key: string
    ): Promise<{ success: boolean; error?: string }> => {
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
      const name = data.assigned_to || "Student";

      setIsActivated(true);
      setRole(detectedRole);
      setUserName(name);
      setShowLicenceModal(false);

      localStorage.setItem(STORAGE_KEY, "activated");
      localStorage.setItem(ROLE_KEY, detectedRole);
      localStorage.setItem(USER_KEY, name);
      localStorage.setItem(LICENCE_VAL_KEY, trimmed);

      return { success: true };
    },
    []
  );

  const logout = useCallback(() => {
    setIsActivated(false);
    setRole(null);
    setUserName(null);
    setShowLicenceModal(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LICENCE_VAL_KEY);
  }, []);

  const openLicenceModal = useCallback(() => {
    setShowLicenceModal(true);
  }, []);

  const dismissModal = useCallback(() => {
    setShowLicenceModal(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isActivated,
        role,
        isAdmin: role === "admin",
        userName,
        activate,
        logout,
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

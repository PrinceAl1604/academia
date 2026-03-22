"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

type Role = "user" | "admin" | null;

interface AuthContextType {
  isActivated: boolean;
  role: Role;
  isAdmin: boolean;
  activate: (key: string) => boolean;
  showLicenceModal: boolean;
  openLicenceModal: () => void;
  dismissModal: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "academia-licence";
const ROLE_KEY = "academia-role";

function detectRole(key: string): "user" | "admin" {
  const upper = key.trim().toUpperCase();
  if (upper.startsWith("ADMIN-")) return "admin";
  return "user";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isActivated, setIsActivated] = useState(false);
  const [role, setRole] = useState<Role>(null);
  const [showLicenceModal, setShowLicenceModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load activation state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedRole = localStorage.getItem(ROLE_KEY) as Role;
    if (saved === "activated") {
      setIsActivated(true);
      setRole(savedRole || "user");
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

  const activate = useCallback((key: string) => {
    const trimmed = key.trim();
    if (trimmed.length >= 4) {
      const detectedRole = detectRole(trimmed);
      setIsActivated(true);
      setRole(detectedRole);
      setShowLicenceModal(false);
      localStorage.setItem(STORAGE_KEY, "activated");
      localStorage.setItem(ROLE_KEY, detectedRole);
      return true;
    }
    return false;
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
        activate,
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

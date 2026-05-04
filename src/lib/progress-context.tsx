"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./auth-context";
import { getUserCourseProgress } from "./api";

interface ProgressContextValue {
  /** Map of courseId → completion percentage (0–100) */
  progress: Record<string, number>;
  /** Re-fetch progress (call after marking a lesson complete) */
  refresh: () => void;
}

const ProgressContext = createContext<ProgressContextValue>({
  progress: {},
  refresh: () => {},
});

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Record<string, number>>({});
  const userId = user?.id;

  // Stabilize on user.id, not the user OBJECT — Supabase rebuilds the
  // user object on every token refresh (every ~hour) which would
  // otherwise re-fetch progress for every course on every refresh.
  const refresh = useCallback(() => {
    if (!userId) return;
    getUserCourseProgress(userId).then(setProgress);
  }, [userId]);

  useEffect(() => {
    if (userId) refresh();
    else setProgress({});
  }, [userId, refresh]);

  return (
    <ProgressContext.Provider value={{ progress, refresh }}>
      {children}
    </ProgressContext.Provider>
  );
}

export const useProgress = () => useContext(ProgressContext);

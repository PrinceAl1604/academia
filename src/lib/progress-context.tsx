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

  const refresh = useCallback(() => {
    if (!user) return;
    getUserCourseProgress(user.id).then(setProgress);
  }, [user]);

  // Fetch on login / user change
  useEffect(() => {
    if (user) refresh();
    else setProgress({});
  }, [user, refresh]);

  return (
    <ProgressContext.Provider value={{ progress, refresh }}>
      {children}
    </ProgressContext.Provider>
  );
}

export const useProgress = () => useContext(ProgressContext);

"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarState>({
  collapsed: false,
  toggle: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem("sidebar_collapsed", String(!prev));
      return !prev;
    });
  };

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

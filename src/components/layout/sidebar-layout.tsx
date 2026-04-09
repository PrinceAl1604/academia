"use client";

import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context";
import { cn } from "@/lib/utils";

function SidebarLayoutInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950">
      <DashboardSidebar />
      <div className={cn("transition-[padding] duration-300 ease-in-out", collapsed ? "lg:pl-[68px]" : "lg:pl-60")}>
        <DashboardTopbar />
        {children}
      </div>
    </div>
  );
}

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <SidebarLayoutInner>{children}</SidebarLayoutInner>
    </SidebarProvider>
  );
}

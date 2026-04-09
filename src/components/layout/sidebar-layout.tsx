"use client";

import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context";
import { cn } from "@/lib/utils";

function SidebarLayoutInner({
  children,
  className,
  showTopbar = true,
}: {
  children: React.ReactNode;
  className?: string;
  showTopbar?: boolean;
}) {
  const { collapsed } = useSidebar();

  return (
    <div className={cn("min-h-screen bg-neutral-50/50 dark:bg-neutral-950", className)}>
      <DashboardSidebar />
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          collapsed ? "lg:pl-[72px]" : "lg:pl-64"
        )}
      >
        {showTopbar && <DashboardTopbar />}
        {children}
      </div>
    </div>
  );
}

export function SidebarLayout({
  children,
  className,
  showTopbar = true,
}: {
  children: React.ReactNode;
  className?: string;
  showTopbar?: boolean;
}) {
  return (
    <SidebarProvider>
      <SidebarLayoutInner className={className} showTopbar={showTopbar}>
        {children}
      </SidebarLayoutInner>
    </SidebarProvider>
  );
}

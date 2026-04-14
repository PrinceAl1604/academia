"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context";
import { useAuth } from "@/lib/auth-context";
import { ProUpsellOverlay } from "@/components/shared/pro-upsell-overlay";
import { cn } from "@/lib/utils";

function SidebarLayoutInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const { isAuthenticated, hasOnboarded, loading } = useAuth();
  const router = useRouter();

  // Redirect to onboarding if user hasn't completed it
  useEffect(() => {
    if (!loading && isAuthenticated && !hasOnboarded) {
      router.push("/onboarding");
    }
  }, [loading, isAuthenticated, hasOnboarded, router]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <div className={cn("transition-[padding] duration-300 ease-in-out", collapsed ? "lg:pl-[68px]" : "lg:pl-60")}>
        <DashboardTopbar />
        {children}
      </div>
      <ProUpsellOverlay />
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

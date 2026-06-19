"use client";

import { Loader2 } from "lucide-react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { useAuth } from "@/lib/auth-context";
import { LandingPage } from "@/components/landing/landing-page";
import { WelcomeHome } from "@/components/community/welcome-home";

/**
 * Root route.
 *  - Logged-out → marketing landing (on the landing host; the app host
 *    redirects "/" to /sign-in via middleware).
 *  - Logged-in → the community **Home = Welcome page**. The course catalog
 *    now lives in its Classroom course space (see /spaces/[slug]).
 */
export default function HomePage() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <SidebarLayout>
      <WelcomeHome />
    </SidebarLayout>
  );
}

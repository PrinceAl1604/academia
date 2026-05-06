"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";

/**
 * Admin layout.
 *
 * Admin role is enforced SERVER-SIDE by middleware — a request to
 * /admin only reaches this layout if the JWT's user_metadata.role
 * is "admin" OR the public.users row says role="admin". So we
 * deliberately do NOT gate render on client-side `isAdmin`: the
 * localStorage profile cache can briefly be out of sync (stale
 * after a role change, or empty if primeProfileCacheForUser
 * hasn't completed yet), and gating on it would render `null` to
 * a real admin — i.e., a black screen — until the cache catches
 * up. We've been bitten by exactly that. Trust the middleware;
 * if you're here, you're an admin.
 *
 * The only client-side guard left is "send fully-unauthenticated
 * users to /sign-in" — covers the edge where someone signs out
 * in another tab and their stale React state lingers.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    );
  }

  // About to redirect — render nothing rather than flashing the
  // admin shell to a not-actually-authenticated user.
  if (!isAuthenticated) return null;

  return (
    <SidebarLayout>
      <main className="p-4 lg:p-8">{children}</main>
    </SidebarLayout>
  );
}

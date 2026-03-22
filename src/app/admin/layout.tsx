"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, isActivated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAdmin || !isActivated) {
      router.push("/");
    }
  }, [isAdmin, isActivated, router]);

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <DashboardSidebar />
      <div className="lg:pl-64">
        <DashboardTopbar />
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

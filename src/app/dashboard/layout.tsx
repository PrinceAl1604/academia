import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

import { SidebarLayout } from "@/components/layout/sidebar-layout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarLayout>
      <main className="p-4 lg:p-8">{children}</main>
    </SidebarLayout>
  );
}

import { redirect } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { validateUserAccess } from "@/lib/supabase-server";
import { getMemberDirectory } from "@/lib/community/members";
import { MembersDirectoryView } from "@/components/members/members-directory-view";

/**
 * Members directory (Phase 2, UC-2.1).
 *
 * Server-rendered + paginated: only the current page of the
 * `member_directory` view is fetched (private profiles excluded by the
 * view). Auth-gated — logged-in members only.
 */
export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { authenticated } = await validateUserAccess();
  if (!authenticated) redirect("/sign-in?redirect=/members");

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const { members, total, pageSize } = await getMemberDirectory({ q, page });

  return (
    <SidebarLayout>
      <MembersDirectoryView
        members={members}
        total={total}
        page={page}
        pageSize={pageSize}
        q={q}
      />
    </SidebarLayout>
  );
}

import { notFound, redirect } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { validateUserAccess } from "@/lib/supabase-server";
import { getMemberProfile } from "@/lib/community/members";
import { MemberProfileView } from "@/components/members/member-profile-view";

/**
 * Member profile (Phase 2, UC-2.2).
 *
 * Public/members profiles render for any logged-in member; `private`
 * profiles 404 for everyone but their owner and admins.
 */
export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { authenticated, user, isAdmin } = await validateUserAccess();
  if (!authenticated) redirect("/sign-in");

  const { id } = await params;
  const { profile, blocked } = await getMemberProfile(id, {
    viewerId: user?.id ?? null,
    isAdmin,
  });
  if (blocked || !profile) notFound();

  return (
    <SidebarLayout>
      <MemberProfileView profile={profile} isSelf={user?.id === profile.id} />
    </SidebarLayout>
  );
}

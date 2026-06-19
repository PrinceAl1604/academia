import { notFound, redirect } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { getSpaceBySlug } from "@/lib/community/queries";
import { SpaceStub } from "./space-stub";

/**
 * Space page (Phase 0).
 *
 * Server-rendered + RLS-aware: `getSpaceBySlug` runs under the user's
 * session, so a member who can't access the space (or a logged-out
 * visitor) simply gets a 404. `link` spaces forward to their URL; the
 * other types render a stub until Phase 1 fills in real rendering.
 */
export default async function SpacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();

  if (space.type === "link") {
    const url = (space.config as { url?: string }).url;
    if (url) redirect(url);
    notFound();
  }

  return (
    <SidebarLayout>
      <SpaceStub space={space} />
    </SidebarLayout>
  );
}

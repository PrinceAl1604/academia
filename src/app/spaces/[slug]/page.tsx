import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import {
  getSpaceNavBySlug,
  getSpaceBySlug,
  getActiveCommunity,
} from "@/lib/community/queries";
import { validateUserAccess, getSupabaseAdmin } from "@/lib/supabase-server";
import type { DocumentConfig } from "@/lib/community/types";
import { PageSpaceView } from "@/components/community/page-space-view";
import { CourseSpace } from "@/components/community/course-space";
import { EventSpace } from "@/components/community/event-space";
import { DocumentSpace } from "@/components/community/document-space";
import { LockWall } from "@/components/community/lock-wall";

/**
 * Space page (Phase 1).
 *
 * Reads metadata from the `space_nav` view (so even a locked Pro space is
 * known to exist), then:
 *  - `link`  → redirect to its URL
 *  - `pro` space + non-Pro member → LockWall (content stays blocked)
 *  - otherwise render by type (page / course / event)
 */
export default async function SpacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const community = await getActiveCommunity();
  if (!community) notFound();

  const meta = await getSpaceNavBySlug(slug, community.id);
  if (!meta) notFound();

  // Pro gate first — so a Pro link space locks rather than redirecting.
  if (meta.access === "pro") {
    const { isPro, isAdmin } = await validateUserAccess();
    if (!isPro && !isAdmin) {
      return (
        <SidebarLayout>
          <LockWall name={meta.name} emoji={meta.emoji} />
        </SidebarLayout>
      );
    }
  }

  if (meta.type === "link") {
    if (meta.link_url) redirect(meta.link_url);
    notFound();
  }

  let body: ReactNode;
  if (meta.type === "course") {
    body = <CourseSpace name={meta.name} emoji={meta.emoji} />;
  } else if (meta.type === "event") {
    body = <EventSpace spaceId={meta.id} name={meta.name} emoji={meta.emoji} />;
  } else if (meta.type === "document") {
    // Reaching here means the viewer passed the access check (LockWall above
    // + RLS on getSpaceBySlug), so it's safe to mint signed download URLs.
    const space = await getSpaceBySlug(slug, community.id);
    if (!space) notFound();
    const docs = (space.config as DocumentConfig).documents ?? [];
    const admin = getSupabaseAdmin();
    const signed = await Promise.all(
      docs.map(async (d) => {
        const { data } = await admin.storage
          .from("space-documents")
          .createSignedUrl(d.path, 3600, { download: d.name });
        return { ...d, url: data?.signedUrl ?? null };
      })
    );
    body = <DocumentSpace name={meta.name} emoji={meta.emoji} documents={signed} />;
  } else {
    // page — needs the full row for content
    const space = await getSpaceBySlug(slug, community.id);
    if (!space) notFound();
    body = <PageSpaceView space={space} whatsappUrl={community.whatsapp_url} />;
  }

  return <SidebarLayout>{body}</SidebarLayout>;
}

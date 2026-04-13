import { NextResponse } from "next/server";
import { validateUserAccess, getSupabaseAdmin } from "@/lib/supabase-server";

export interface CourseStats {
  enrollments: number;
  completions: number;
  avgProgress: number;
  recent7d: number;
}

/**
 * GET /api/admin/course-stats
 * Returns enrollment stats aggregated per course for the admin explorer.
 */
export async function GET() {
  const access = await validateUserAccess();
  if (!access.authenticated || !access.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!access.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id, progress, completed_at, enrolled_at");

  const stats: Record<string, CourseStats> = {};

  for (const e of enrollments ?? []) {
    const id = e.course_id;
    if (!stats[id]) {
      stats[id] = { enrollments: 0, completions: 0, avgProgress: 0, recent7d: 0 };
    }
    stats[id].enrollments++;
    if (e.completed_at) stats[id].completions++;
    stats[id].avgProgress += Number(e.progress ?? 0);
    if (e.enrolled_at && e.enrolled_at >= sevenDaysAgo) stats[id].recent7d++;
  }

  // Convert summed progress to averages
  for (const id of Object.keys(stats)) {
    if (stats[id].enrollments > 0) {
      stats[id].avgProgress = Math.round(stats[id].avgProgress / stats[id].enrollments);
    }
  }

  return NextResponse.json({ stats });
}

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
 *
 * Aggregation runs in Postgres via the admin_course_stats() RPC — the
 * earlier implementation pulled every enrollment row to Node and folded
 * them with Array.reduce, which gets slow once the table grows past a
 * few thousand rows and re-streams the entire table on every dashboard
 * load.
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
  const { data, error } = await supabase.rpc("admin_course_stats");
  if (error) {
    console.error("[admin/course-stats] rpc failed:", error.message);
    return NextResponse.json(
      { error: "Could not load stats" },
      { status: 500 }
    );
  }

  // Reshape to the keyed map the client expects. The RPC returns one
  // row per course with snake_case columns; the client wants camelCase
  // and a Record<courseId, stats>.
  type Row = {
    course_id: string;
    enrollments: number;
    completions: number;
    avg_progress: number;
    recent_7d: number;
  };
  const stats: Record<string, CourseStats> = {};
  for (const r of (data ?? []) as Row[]) {
    stats[r.course_id] = {
      enrollments: Number(r.enrollments),
      completions: Number(r.completions),
      avgProgress: Number(r.avg_progress),
      recent7d: Number(r.recent_7d),
    };
  }

  return NextResponse.json({ stats });
}

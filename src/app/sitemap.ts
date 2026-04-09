import type { MetadataRoute } from "next";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://academia-vert-phi.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getSupabaseAdmin();

  // Fetch all published course slugs
  const { data: courses } = await supabase
    .from("courses")
    .select("slug, updated_at")
    .eq("is_published", true);

  const courseEntries: MetadataRoute.Sitemap = (courses ?? []).map((course) => ({
    url: `${BASE_URL}/courses/${course.slug}`,
    lastModified: course.updated_at,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/sign-in`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/sign-up`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...courseEntries,
  ];
}

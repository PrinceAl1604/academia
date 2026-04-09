import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase-server";

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getSupabaseAdmin();

  const { data: course } = await supabase
    .from("courses")
    .select("title, description, cover_url, category:categories(name), instructor:instructors(name)")
    .eq("slug", slug)
    .single();

  if (!course) {
    return { title: "Course Not Found" };
  }

  const title = course.title;
  const description =
    course.description || `Learn ${course.title} on Brightroots`;
  const category = (course.category as { name: string } | null)?.name;
  const instructor = (course.instructor as { name: string } | null)?.name;

  // Use cover image or YouTube thumbnail as OG image
  const ogImage = course.cover_url || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
    other: {
      ...(category && { "article:section": category }),
      ...(instructor && { "article:author": instructor }),
    },
  };
}

export default function CourseLayout({ children }: Props) {
  return children;
}

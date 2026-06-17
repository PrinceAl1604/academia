import type { MetadataRoute } from "next";
import { headers } from "next/headers";

// Two-domain split: only the marketing landing is indexable, so the
// sitemap lists the marketing pages. The product app (courses behind
// auth, dashboard, admin) is noindex and contributes no entries.
const LANDING_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://programme.workshop-visible.com";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://app.workshop-visible.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("host");
  let appHost: string | null = null;
  try {
    appHost = new URL(APP_URL).host;
  } catch {
    appHost = null;
  }

  // App host is noindex — emit an empty sitemap.
  if (appHost && host === appHost) return [];

  // Marketing site map.
  return [
    {
      url: LANDING_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${LANDING_URL}/pricing`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${LANDING_URL}/privacy`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${LANDING_URL}/terms`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}

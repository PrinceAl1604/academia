import type { MetadataRoute } from "next";
import { headers } from "next/headers";

// Two-domain split: the marketing landing is indexable, the product app
// is not. We serve different robots rules per host.
const LANDING_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://programme.workshop-visible.com";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://app.workshop-visible.com";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host");
  let appHost: string | null = null;
  try {
    appHost = new URL(APP_URL).host;
  } catch {
    appHost = null;
  }

  // App host — keep the whole product (login, dashboard, courses, admin)
  // out of search indexes.
  if (appHost && host === appHost) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  // Marketing host (and previews) — indexable.
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${LANDING_URL}/sitemap.xml`,
  };
}

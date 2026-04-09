import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Brightroots",
    short_name: "Brightroots",
    description:
      "Access premium courses taught by industry experts. One subscription, unlimited learning.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#16a34a",
    icons: [
      {
        src: "/favicon-light.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/favicon-dark.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Brightroots",
    short_name: "Brightroots",
    description:
      "Access premium courses taught by industry experts. One subscription, unlimited learning.",
    start_url: "/",
    display: "standalone",
    // Force-dark app — give installed PWA chrome a matching dark
    // splash/title bar instead of the previous white default.
    background_color: "#1c1c1c",
    theme_color: "#269e5f",
    icons: [
      {
        src: "/symbol.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}

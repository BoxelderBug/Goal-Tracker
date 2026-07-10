import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Goal Tracker",
    short_name: "Goals",
    description: "Track your goals, log progress, and review your weeks, months, and years.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#009f94",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}

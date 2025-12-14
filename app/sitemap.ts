import type { MetadataRoute } from "next";
import { concepts } from "@/data/concepts";

// Same slugify logic you already use elsewhere
function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.aipmworld.com";
  const lastModified = new Date();

  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified },
    { url: `${baseUrl}/basics`, lastModified },
    { url: `${baseUrl}/swipe`, lastModified },
    { url: `${baseUrl}/compare`, lastModified },
  ];

  // Concept pages
  const conceptRoutes: MetadataRoute.Sitemap = concepts.map((c) => ({
    url: `${baseUrl}/concept/${slugify(c.topic)}`,
    lastModified,
  }));

  return [...staticRoutes, ...conceptRoutes];
}

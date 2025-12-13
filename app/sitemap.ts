import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://YOUR_DOMAIN.com";

  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/basics`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/swipe`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/compare`,
      lastModified: new Date(),
    },
  ];
}

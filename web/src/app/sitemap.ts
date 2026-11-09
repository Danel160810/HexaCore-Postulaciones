import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

// /sitemap.xml: las páginas públicas.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
    ["/postulaciones", 1, "weekly"],
    ["/terminos", 0.2, "yearly"],
    ["/privacidad", 0.2, "yearly"],
  ];
  return pages.map(([path, priority, changeFrequency]) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}

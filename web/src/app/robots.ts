import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

// /robots.txt: se indexa la web pública; el panel staff, la API y las páginas privadas no.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/login", "/sin-acceso", "/postular/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

import type { MetadataRoute } from "next";
import { allowIndexing, siteUrl } from "@/lib/env";

/** Production allows crawling of public pages. Previews and local builds block everything. */
export default function robots(): MetadataRoute.Robots {
  if (!allowIndexing()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/staff", "/rewards", "/login", "/auth", "/api"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}

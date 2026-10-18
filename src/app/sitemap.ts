import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  const pages: { path: string; priority: number; freq: "daily" | "weekly" }[] = [
    { path: "/", priority: 1, freq: "daily" },
    { path: "/menu", priority: 0.9, freq: "daily" },
    { path: "/game", priority: 0.9, freq: "weekly" },
    { path: "/challenge", priority: 0.8, freq: "weekly" },
    { path: "/team", priority: 0.6, freq: "weekly" },
    { path: "/rules", priority: 0.5, freq: "weekly" },
  ];
  return pages.map((p) => ({ url: `${base}${p.path}`, lastModified: now, changeFrequency: p.freq, priority: p.priority }));
}

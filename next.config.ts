import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

function supabaseHost(): string | null {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host : null;
  } catch {
    return null;
  }
}

const supabase = supabaseHost();

// The site's public address and whether search engines may index it, decided once at build time and
// baked in, so pages regenerated later keep the same answer. Netlify sets URL (the site's main
// address) and CONTEXT ("production", "deploy-preview", ...) during its build; Vercel sets
// VERCEL_PROJECT_PRODUCTION_URL and VERCEL_ENV. NEXT_PUBLIC_SITE_URL and ALLOW_INDEXING override.
const siteAddress =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
const indexable = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === "production"
  : process.env.CONTEXT
    ? process.env.CONTEXT === "production"
    : process.env.ALLOW_INDEXING === "true";

// Next.js injects small inline scripts for hydration, so script-src keeps 'unsafe-inline'.
// Everything else is locked to this site and the Supabase project.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${supabase ? ` https://${supabase}` : ""}`,
  "font-src 'self'",
  `connect-src 'self'${supabase ? ` https://${supabase} wss://${supabase}` : ""}${isDev ? " ws:" : ""}`,
  "media-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  env: {
    ...(siteAddress ? { NEXT_PUBLIC_SITE_URL: siteAddress } : {}),
    ALLOW_INDEXING: String(indexable),
  },
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabase ? [{ protocol: "https", hostname: supabase, pathname: "/storage/v1/object/public/**" }] : [],
    // Pictures change rarely; don't make phones re-download them every minute.
    minimumCacheTTL: 60 * 60 * 24,
  },
  experimental: {
    // Admin photo uploads go through server actions (default limit 1 MB). The admin form shrinks
    // photos in the browser first; this leaves room under Vercel's 4.5 MB request cap.
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Camera is allowed for this site only, for scanning coupon QR codes at the stall.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      {
        // Team photos: on the team page, but kept out of search engines and image search.
        source: "/images/team/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, noimageindex" }],
      },
    ];
  },
};

export default nextConfig;

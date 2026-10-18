/**
 * Public configuration. Only NEXT_PUBLIC_* values may appear here; they are inlined into the
 * browser bundle at build time. Server secrets live in src/lib/supabase/admin.ts.
 */
export const SITE_NAME = "TERRA UTSAV";

export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL || // Netlify: the site's main address
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return supabaseConfig() !== null;
}

/**
 * Search engines may index the site only on the production deployment. Netlify and Vercel preview
 * deployments (and local builds) send noindex so they never compete with the real domain.
 */
export function allowIndexing(): boolean {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === "production";
  if (process.env.CONTEXT) return process.env.CONTEXT === "production"; // Netlify
  return process.env.ALLOW_INDEXING === "true";
}

export function googleAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true";
}

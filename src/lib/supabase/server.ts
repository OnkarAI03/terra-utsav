import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseConfig } from "@/lib/env";

/**
 * A Supabase client acting as the signed-in visitor (their cookies, their RLS permissions).
 * Create one per request. Returns null when Supabase has not been configured yet.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const config = supabaseConfig();
  if (!config) return null;
  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. The middleware
          // refreshes the session, so this can be ignored safely.
        }
      },
    },
  });
}

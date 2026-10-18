import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/env";

/**
 * Anonymous, cookie-free client for public content (menu, team, settings). Because it does not
 * read cookies, pages that use it can be statically generated and revalidated.
 */
export function createSupabasePublicClient(): SupabaseClient | null {
  const config = supabaseConfig();
  if (!config) return null;
  return createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

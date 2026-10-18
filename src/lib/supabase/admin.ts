import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/env";

/**
 * Service-role client. Bypasses row level security, so it is used only on the server, only after
 * the caller's identity has been verified, and only to call the game functions that are locked to
 * the service role. The key must never be exposed to the browser (no NEXT_PUBLIC_ prefix).
 */
export function createSupabaseServiceClient(): SupabaseClient | null {
  const config = supabaseConfig();
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !secret) return null;
  return createClient(config.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

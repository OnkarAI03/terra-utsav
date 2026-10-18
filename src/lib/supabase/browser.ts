"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/env";

let client: SupabaseClient | null | undefined;

/** Browser client with the publishable key. Row level security decides what it can see. */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const config = supabaseConfig();
  client = config ? createBrowserClient(config.url, config.key) : null;
  return client;
}

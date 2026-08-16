import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zftiavnouhpdwiidnukd.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        "sb_publishable_R1TRDBp0jS4aYJe0Bx7IOQ_SWh-cqkv",
    );
  }
  return client;
}

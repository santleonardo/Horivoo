import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cachedClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (cachedClient) return cachedClient;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Return null instead of throwing — the page will handle this gracefully
    return null as unknown as ReturnType<typeof createBrowserClient>;
  }

  cachedClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cachedClient;
}

export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

import { createClient } from "@supabase/supabase-js";

// Re-export client-safe URL helpers for backward compatibility
export {
  getSupabaseImageUrl,
  extractSupabasePath,
  getTransformedUrl,
} from "./supabase-url";

/**
 * Supabase admin client (server-side only).
 * Uses service role key for Storage bucket write access.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

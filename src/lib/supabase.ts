import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client (server-side only).
 * Uses service role key for Storage bucket write access.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Returns the public URL for a file in the "motos" bucket.
 * Optionally applies Supabase Image Transformations (resize, quality).
 */
export function getSupabaseImageUrl(
  path: string,
  options?: { width?: number; height?: number; quality?: number }
): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!options) {
    return `${baseUrl}/storage/v1/object/public/motos/${path}`;
  }

  const params = new URLSearchParams();
  if (options.width) params.set("width", String(options.width));
  if (options.height) params.set("height", String(options.height));
  if (options.quality) params.set("quality", String(options.quality));

  return `${baseUrl}/storage/v1/render/image/public/motos/${path}?${params.toString()}`;
}

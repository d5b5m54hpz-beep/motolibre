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

/**
 * Extracts the relative path from a full Supabase Storage URL.
 * E.g. "https://xyz.supabase.co/storage/v1/object/public/motos/solicitudes/abc/foto.jpg"
 *   → "solicitudes/abc/foto.jpg"
 */
export function extractSupabasePath(fullUrl: string): string | null {
  const marker = "/storage/v1/object/public/motos/";
  const idx = fullUrl.indexOf(marker);
  if (idx === -1) return null;
  return fullUrl.slice(idx + marker.length);
}

/**
 * Returns a transformed URL for an image stored in Supabase.
 * Accepts full URLs (as stored in the DB) and applies resize/quality transforms.
 * Falls back to the original URL if the path can't be extracted.
 */
export function getTransformedUrl(
  fullUrl: string,
  options: { width?: number; height?: number; quality?: number }
): string {
  const path = extractSupabasePath(fullUrl);
  if (!path) return fullUrl;
  return getSupabaseImageUrl(path, options);
}

import { createFileRoute } from "@tanstack/react-router";

// ─── Signed URL cache ────────────────────────────────────────────────────────
// Supabase signed URLs are valid for 1 hour. We cache them per-path and
// regenerate only when less than 5 minutes remain. This means one Supabase
// round-trip every ~55 minutes instead of on every media request.
const SIGNED_URL_TTL_MS = 55 * 60 * 1000; // 55 minutes
interface CacheEntry { url: string; expiresAt: number }
const signedUrlCache = new Map<string, CacheEntry>();

async function getSignedUrl(path: string): Promise<string | null> {
  const now = Date.now();
  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt > now) return cached.url;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from("invite-media")
    .createSignedUrl(path, 60 * 60); // 1h URL
  if (error || !data) return null;

  signedUrlCache.set(path, { url: data.signedUrl, expiresAt: now + SIGNED_URL_TTL_MS });
  return data.signedUrl;
}

// ─── Route ───────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/api/public/media/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!path || path.includes("..")) return new Response("Not found", { status: 404 });

        const signedUrl = await getSignedUrl(path);
        if (!signedUrl) return new Response("Not found", { status: 404 });

        // ETag is the stable path — allows browsers to send If-None-Match
        // and get a 304 on repeated visits without re-downloading the file.
        const etag = `"${encodeURIComponent(path)}"`;
        if (request.headers.get("if-none-match") === etag) {
          return new Response(null, {
            status: 304,
            headers: {
              "cache-control": "public, max-age=31536000, immutable",
              etag,
            },
          });
        }

        const range = request.headers.get("range");

        // ── Non-range requests: redirect to Supabase CDN ────────────────────
        // The browser fetches directly from Supabase's global CDN edge nodes,
        // bypassing our server entirely. This is the biggest speed win for
        // images and audio. We still proxy range requests so video seeking works.
        if (!range) {
          return new Response(null, {
            status: 302,
            headers: {
              location: signedUrl,
              "cache-control": "public, max-age=3600",
              etag,
            },
          });
        }

        // ── Range requests: proxy so video seeking works ────────────────────
        const upstream = await fetch(signedUrl, { headers: { range } });
        const headers = new Headers();
        for (const key of ["content-type", "content-length", "content-range", "accept-ranges"]) {
          const value = upstream.headers.get(key);
          if (value) headers.set(key, value);
        }
        headers.set("cache-control", "public, max-age=31536000, immutable");
        headers.set("etag", etag);
        return new Response(upstream.body, { status: upstream.status, headers });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/media/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!path || path.includes("..")) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage
          .from("invite-media")
          .createSignedUrl(path, 60 * 60);
        if (error || !data) return new Response("Not found", { status: 404 });

        const range = request.headers.get("range");
        const upstream = await fetch(data.signedUrl, range ? { headers: { range } } : undefined);
        const headers = new Headers();
        for (const key of ["content-type", "content-length", "content-range", "accept-ranges"]) {
          const value = upstream.headers.get(key);
          if (value) headers.set(key, value);
        }
        headers.set("cache-control", "public, max-age=31536000, immutable");
        return new Response(upstream.body, { status: upstream.status, headers });
      },
    },
  },
});

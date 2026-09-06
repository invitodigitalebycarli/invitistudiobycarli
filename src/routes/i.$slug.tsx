import { createFileRoute, notFound } from "@tanstack/react-router";
import { InviteApp } from "@/components/invite/InviteApp";
import { getSiteFn } from "@/lib/invite.functions";

export const Route = createFileRoute("/i/$slug")({
  loader: async ({ params }) => {
    const res = await getSiteFn({ data: { slug: params.slug } });
    if (!res) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Invito non disponibile" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = loaderData.site.name || "Invito";
    const description = "Apri il tuo invito digitale: video, dettagli, dresscode e conferma.";
    const socialPath = loaderData.site.media?.social ?? loaderData.site.media?.poster;
    const origin =
      loaderData.origin && !loaderData.origin.includes("lovableproject.com")
        ? loaderData.origin
        : "https://invitistudiobycarli.lovable.app";
    const image =
      socialPath
        ? /^https?:\/\//.test(socialPath)
          ? socialPath
          : `${origin}/api/public/media/${socialPath}`
        : null;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: title },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
    };
  },
  component: InvitePage,
  notFoundComponent: () => (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-center">
      <p className="text-sm text-white/60">Invito non trovato.</p>
    </main>
  ),
  errorComponent: () => (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-center">
      <p className="text-sm text-white/60">Invito non disponibile.</p>
    </main>
  ),
});

function InvitePage() {
  const { site } = Route.useLoaderData();
  return <InviteApp initialSite={site} publicOnly />;
}

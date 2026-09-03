import { createFileRoute, notFound } from "@tanstack/react-router";
import { InviteApp } from "@/components/invite/InviteApp";
import { getSiteFn } from "@/lib/invite.functions";

export const Route = createFileRoute("/i/$slug")({
  loader: async ({ params }) => {
    const site = await getSiteFn({ data: { slug: params.slug } });
    if (!site) throw notFound();
    return { site };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Invito non disponibile" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = loaderData.site.name || "Invito";
    const description = "Apri il tuo invito digitale: video, dettagli, dresscode e conferma.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: InvitePage,
  notFoundComponent: () => (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
      <p className="text-sm text-black/60">Invito non trovato.</p>
    </main>
  ),
  errorComponent: () => (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
      <p className="text-sm text-black/60">Invito non disponibile.</p>
    </main>
  ),
});

function InvitePage() {
  const { site } = Route.useLoaderData();
  return <InviteApp initialSite={site} publicOnly />;
}

import { createFileRoute } from "@tanstack/react-router";
import { InviteApp } from "@/components/invite/InviteApp";
import { getActiveSiteFn } from "@/lib/invite.functions";

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      const res = await getActiveSiteFn({});
      return res;
    } catch {
      return null;
    }
  },
  head: ({ loaderData }) => {
    const title =
      loaderData?.site?.texts?.socialTitle ||
      (loaderData?.site?.name ? `${loaderData.site.name} — Invito Digitale` : "Invito Digitale by Carli");
    const description =
      loaderData?.site?.texts?.socialDesc ||
      "Apri il tuo invito digitale: immagini, video, audio, link e dresscode.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
    };
  },
  component: IndexPage,
});

function IndexPage() {
  const data = Route.useLoaderData();
  return <InviteApp initialSite={data?.site ?? null} publicOnly={false} />;
}

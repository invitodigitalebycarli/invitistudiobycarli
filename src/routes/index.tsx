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
    const title = loaderData?.site?.name
      ? `${loaderData.site.name} — Invito Digitale`
      : "Invito Digitale by Carli";
    return {
      meta: [
        { title },
        {
          name: "description",
          content:
            "Template di invito digitale 9:16: cover, video animato, invito finale con link, dresscode, musica e logo. Modificabile e duplicabile.",
        },
        { property: "og:title", content: title },
        {
          property: "og:description",
          content:
            "Crea, personalizza e duplica il tuo invito digitale: immagini, video, audio, link e dresscode.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: IndexPage,
});

function IndexPage() {
  const data = Route.useLoaderData();
  return <InviteApp initialSite={data?.site ?? null} publicOnly={false} />;
}

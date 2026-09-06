import { createFileRoute } from "@tanstack/react-router";
import { InviteApp } from "@/components/invite/InviteApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Invito Digitale by Carli" },
      {
        name: "description",
        content:
          "Template di invito digitale 9:16: cover, video animato, invito finale con link, dresscode, musica e logo. Modificabile e duplicabile.",
      },
      { property: "og:title", content: "Invito Digitale by Carli" },
      {
        property: "og:description",
        content:
          "Crea, personalizza e duplica il tuo invito digitale: immagini, video, audio, link e dresscode.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <InviteApp />,
});

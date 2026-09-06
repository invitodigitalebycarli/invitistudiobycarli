// Shared types + helpers for the invite template. Data lives in Lovable Cloud
// (table `invite_sites`), media files in the `invite-media` storage bucket.

export type MediaKey =
  | "poster"
  | "video"
  | "invite"
  | "dresscode"
  | "logo"
  | "music"
  | "social";

export type Hotspot = {
  id: string;
  label: string;
  left: number; // %
  top: number; // %
  width: number; // %
  height: number; // %
  action: "dresscode" | "link";
  url: string;
};

export type ButtonTheme = "dark" | "light";

export type InviteConfig = {
  id: string;
  name: string;
  slug?: string;
  media: Partial<Record<MediaKey, string>>; // media key -> storage path
  texts: { open: string; replay: string };
  instagram: string;
  hotspots: Hotspot[];
  buttonTheme?: ButtonTheme;
};

export const PRODUCTION_URL = "https://invitistudiobycarli.lovable.app";

export function getDefinitiveInviteUrl(slugOrId: string): string {
  if (typeof window === "undefined") {
    return `${PRODUCTION_URL}/i/${slugOrId}`;
  }
  const hostname = window.location.hostname;
  const isPreview =
    hostname.includes("lovableproject.com") ||
    hostname.includes("localhost") ||
    hostname.includes("127.0.0.1") ||
    hostname.endsWith(".lovable.dev");
  const base = isPreview ? PRODUCTION_URL : window.location.origin;
  return `${base}/i/${slugOrId}`;
}

const ACTIVE_KEY = "invite:active";

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function defaultConfig(name = "Invito"): InviteConfig {
  return {
    id: crypto.randomUUID(),
    name,
    slug: slugify(`${name}-${Math.random().toString(36).slice(2, 6)}`),
    media: {},
    texts: { open: "Tocca per aprire", replay: "Riguarda" },
    instagram: "https://instagram.com/invitodigitalebycarli",
    buttonTheme: "dark",
    hotspots: [
      {
        id: "left",
        label: "Dresscode",
        left: 31.9,
        top: 64.2,
        width: 15,
        height: 8.5,
        action: "dresscode",
        url: "",
      },
      {
        id: "center",
        label: "Mappa",
        left: 48.8,
        top: 64.2,
        width: 15,
        height: 8.5,
        action: "link",
        url: "https://maps.google.com/?q=Ristorante+Villa+Desiderio",
      },
      {
        id: "right",
        label: "Conferma",
        left: 65.7,
        top: 64.2,
        width: 15,
        height: 8.5,
        action: "link",
        url: "https://forms.gle/P6zVe6tgjWskmnsx5",
      },
    ],
  };
}

export function mediaUrl(path?: string): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `/api/public/media/${path}`;
}

export function getActiveId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}

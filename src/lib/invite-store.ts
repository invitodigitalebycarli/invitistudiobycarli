// Local persistence for the invite template: config in localStorage, media blobs in IndexedDB.

export type MediaKey = "poster" | "video" | "invite" | "dresscode" | "logo" | "music";

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

export type InviteConfig = {
  id: string;
  name: string;
  media: Partial<Record<MediaKey, string>>; // media key -> blob id
  texts: { open: string; replay: string };
  instagram: string;
  hotspots: Hotspot[];
};

const CONFIG_KEY = "invite:sites";
const ACTIVE_KEY = "invite:active";
const DB_NAME = "invite-media";
const STORE = "files";

export function defaultConfig(name = "Invito"): InviteConfig {
  return {
    id: crypto.randomUUID(),
    name,
    media: {},
    texts: { open: "Tocca per aprire", replay: "Riguarda" },
    instagram: "https://instagram.com/invitodigitalebycarli",
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

export function loadSites(): InviteConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    const parsed = raw ? (JSON.parse(raw) as InviteConfig[]) : [];
    if (parsed.length) return parsed;
  } catch {
    /* ignore */
  }
  const initial = [defaultConfig()];
  saveSites(initial);
  return initial;
}

export function saveSites(sites: InviteConfig[]) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(sites));
}

export function getActiveId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putMedia(file: File): Promise<string> {
  const db = await openDb();
  const id = crypto.randomUUID();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(file, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return id;
}

export async function getMedia(id: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function copyMedia(id: string): Promise<string | null> {
  const blob = await getMedia(id);
  if (!blob) return null;
  const file = new File([blob], "copy", { type: blob.type });
  return putMedia(file);
}

export async function duplicateSite(site: InviteConfig): Promise<InviteConfig> {
  const media: InviteConfig["media"] = {};
  for (const [key, value] of Object.entries(site.media)) {
    if (!value) continue;
    const copy = await copyMedia(value);
    if (copy) media[key as MediaKey] = copy;
  }
  return {
    ...site,
    id: crypto.randomUUID(),
    name: `${site.name} (copia)`,
    media,
    hotspots: site.hotspots.map((h) => ({ ...h })),
  };
}

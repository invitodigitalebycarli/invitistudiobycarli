import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, Plus, RotateCcw, Volume2, VolumeX, X, Copy, Pencil, Trash2 } from "lucide-react";
import {
  type InviteConfig,
  type MediaKey,
  defaultConfig,
  duplicateSite,
  getActiveId,
  loadSites,
  putMedia,
  saveSites,
  setActiveId,
} from "@/lib/invite-store";
import { useMediaUrl } from "@/components/invite/useMediaUrl";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Invito Digitale — Template modificabile" },
      {
        name: "description",
        content:
          "Template di invito digitale 9:16: cover, video animato, invito finale con link, dresscode, musica e logo. Modificabile e duplicabile.",
      },
      { property: "og:title", content: "Invito Digitale — Template modificabile" },
      {
        property: "og:description",
        content:
          "Crea, personalizza e duplica il tuo invito digitale: immagini, video, audio, link e dresscode.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const PIN = "236486";
const BADGE =
  "badge-glass inline-flex items-center justify-center gap-2 transition-transform active:scale-95";

const MEDIA_LABELS: { key: MediaKey; label: string; accept: string }[] = [
  { key: "poster", label: "Copertina (immagine)", accept: "image/*" },
  { key: "video", label: "Video animazione", accept: "video/*" },
  { key: "invite", label: "Invito finale (immagine)", accept: "image/*" },
  { key: "dresscode", label: "Dresscode (immagine)", accept: "image/*" },
  { key: "logo", label: "Logo", accept: "image/*" },
  { key: "music", label: "Musica (audio)", accept: "audio/*,*/*" },
];

function Index() {
  const [sites, setSites] = useState<InviteConfig[]>([]);
  const [activeId, setActive] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [scene, setScene] = useState<"cover" | "video" | "invite">("cover");
  const [dresscodeOpen, setDresscodeOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<string | null>(null);

  useEffect(() => {
    const loaded = loadSites();
    setSites(loaded);
    const saved = getActiveId();
    setActive(saved && loaded.some((s) => s.id === saved) ? saved : loaded[0].id);
  }, []);

  const site = sites.find((s) => s.id === activeId) ?? null;

  const poster = useMediaUrl(site?.media.poster);
  const video = useMediaUrl(site?.media.video);
  const invite = useMediaUrl(site?.media.invite);
  const dresscode = useMediaUrl(site?.media.dresscode);
  const logo = useMediaUrl(site?.media.logo);
  const music = useMediaUrl(site?.media.music);

  const update = useCallback(
    (patch: Partial<InviteConfig>) => {
      setSites((prev) => {
        const next = prev.map((s) => (s.id === activeId ? { ...s, ...patch } : s));
        saveSites(next);
        return next;
      });
    },
    [activeId],
  );

  const onUpload = async (key: MediaKey, file: File) => {
    const id = await putMedia(file);
    if (!site) return;
    update({ media: { ...site.media, [key]: id } });
  };

  const start = () => {
    if (editMode) return;
    if (video) {
      setScene("video");
      setVideoVisible(true);
      const v = videoRef.current;
      if (v) {
        v.currentTime = 0;
        void v.play().catch(() => undefined);
      }
    } else {
      setScene("invite");
      setInviteVisible(true);
    }
    const a = audioRef.current;
    if (a) {
      a.volume = 0.4;
      a.currentTime = 0;
      void a.play().catch(() => undefined);
    }
  };

  const onVideoEnd = () => {
    setScene("invite");
    setInviteVisible(true);
    setTimeout(() => setVideoVisible(false), 3500);
  };

  const replay = () => {
    setInviteVisible(false);
    setDresscodeOpen(false);
    setTimeout(() => {
      setScene("cover");
      setVideoVisible(false);
      const v = videoRef.current;
      if (v) {
        v.pause();
        v.currentTime = 0;
      }
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.currentTime = 0;
      }
    }, 1200);
  };

  const onDuplicate = async () => {
    if (!site) return;
    const copy = await duplicateSite(site);
    const next = [...sites, copy];
    setSites(next);
    saveSites(next);
    setActive(copy.id);
    setActiveId(copy.id);
  };

  // Hotspot dragging (edit mode only)
  useEffect(() => {
    if (!editMode) return;
    const move = (e: PointerEvent) => {
      const id = dragRef.current;
      const el = stageRef.current;
      if (!id || !el || !site) return;
      const rect = el.getBoundingClientRect();
      const left = ((e.clientX - rect.left) / rect.width) * 100;
      const top = ((e.clientY - rect.top) / rect.height) * 100;
      update({
        hotspots: site.hotspots.map((h) =>
          h.id === id
            ? { ...h, left: Math.min(100, Math.max(0, left)), top: Math.min(100, Math.max(0, top)) }
            : h,
        ),
      });
    };
    const up = () => (dragRef.current = null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [editMode, site, update]);

  if (!site) return <main className="fixed inset-0 bg-white" />;

  const showInvite = scene === "invite";

  return (
    <main className="fixed inset-0 overflow-hidden bg-black">
      <div
        ref={stageRef}
        className="relative mx-auto h-full w-full max-w-[calc(100dvh*9/16)] bg-white"
      >
        {/* Cover */}
        {poster ? (
          <img
            src={poster}
            alt="Copertina invito"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <Slot
            label="Copertina"
            accept="image/*"
            editMode={editMode}
            onFile={(f) => onUpload("poster", f)}
          />
        )}

        {/* Video */}
        {video && (
          <video
            ref={videoRef}
            src={video}
            poster={poster ?? undefined}
            muted
            playsInline
            preload="auto"
            onEnded={onVideoEnd}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[600ms] ${
              videoVisible ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />
        )}

        {/* Invito finale */}
        {showInvite &&
          (invite ? (
            <img
              src={invite}
              alt="Invito"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[3500ms] ease-out ${
                inviteVisible ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : (
            <Slot
              label="Invito finale"
              accept="image/*"
              editMode={editMode}
              onFile={(f) => onUpload("invite", f)}
            />
          ))}

        {/* Hotspots */}
        {(showInvite || editMode) &&
          site.hotspots.map((h) => (
            <button
              key={h.id}
              onPointerDown={() => {
                if (editMode) dragRef.current = h.id;
              }}
              onClick={() => {
                if (editMode) return;
                if (h.action === "dresscode") setDresscodeOpen(true);
                else if (h.url) window.open(h.url, "_blank", "noopener");
              }}
              style={{
                left: `${h.left}%`,
                top: `${h.top}%`,
                width: `${h.width}%`,
                height: `${h.height}%`,
                transform: "translate(-50%, -50%)",
              }}
              className={`absolute rounded-full active:opacity-40 ${
                editMode
                  ? "z-30 cursor-move border-2 border-dashed border-black/60 bg-white/40 text-[10px] font-semibold text-black"
                  : "z-10"
              }`}
            >
              {editMode ? h.label : null}
            </button>
          ))}

        {/* Cover tap */}
        {scene === "cover" && !editMode && (
          <button
            onClick={start}
            className="absolute inset-0 z-10 flex animate-fade-in items-end justify-center pb-[25%]"
          >
            <span className={`${BADGE} animate-soft-float px-5 py-2.5 text-sm tracking-wide`}>
              {site.texts.open}
            </span>
          </button>
        )}

        {/* Controls */}
        {scene !== "cover" && !editMode && (
          <>
            <button onClick={replay} className={`${BADGE} absolute left-4 top-4 z-20 px-4 py-2 text-sm`}>
              <RotateCcw size={16} /> {site.texts.replay}
            </button>
            <button
              onClick={() => {
                const a = audioRef.current;
                if (a) a.muted = !a.muted;
                setMuted((m) => !m);
              }}
              className={`${BADGE} absolute right-4 top-4 z-20 h-10 w-10`}
              aria-label="Audio"
            >
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </>
        )}

        {/* Dresscode overlay */}
        {dresscodeOpen && (
          <div
            onClick={() => setDresscodeOpen(false)}
            className="absolute inset-0 z-20 flex animate-fade-in items-center justify-center bg-black/70 px-5 backdrop-blur-sm"
          >
            {dresscode ? (
              <img
                src={dresscode}
                alt="Dresscode"
                className="max-h-[78%] w-full rounded-3xl object-contain shadow-2xl"
              />
            ) : (
              <p className="text-sm text-white/80">Nessuna immagine dresscode caricata</p>
            )}
            <button
              onClick={() => setDresscodeOpen(false)}
              className={`${BADGE} absolute right-4 top-4 h-10 w-10`}
              aria-label="Chiudi"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Footer logo */}
        <a
          href={site.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 z-10 block h-7 w-7 overflow-hidden rounded-full shadow-md shadow-black/30 ring-1 ring-white/60"
          aria-label="Instagram"
        >
          {logo ? (
            <img src={logo} alt="Logo" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-black/40 text-white">
              <Plus size={14} />
            </span>
          )}
        </a>

        {music && <audio ref={audioRef} src={music} loop />}
      </div>

      {/* Edit entry */}
      <button
        onClick={() => (editMode ? setEditMode(false) : setPinOpen(true))}
        className={`${BADGE} fixed bottom-4 left-4 z-40 px-4 py-2 text-xs`}
      >
        {editMode ? <X size={14} /> : <Lock size={14} />}
        {editMode ? "Chiudi editor" : "Modifica"}
      </button>

      {pinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6">
          <div className="w-full max-w-xs rounded-2xl bg-background p-5 text-foreground shadow-2xl">
            <h2 className="text-base font-semibold">Inserisci il PIN</h2>
            <input
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value)}
              inputMode="numeric"
              type="password"
              className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="PIN"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  if (pinValue === PIN) {
                    setEditMode(true);
                    setPinOpen(false);
                    setPinValue("");
                  }
                }}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                Entra
              </button>
              <button
                onClick={() => setPinOpen(false)}
                className="rounded-md border border-input px-3 py-2 text-sm"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {editMode && (
        <aside className="fixed right-0 top-0 z-40 h-full w-[340px] max-w-[90vw] overflow-y-auto border-l border-border bg-background p-4 text-foreground shadow-2xl">
          <h2 className="text-sm font-semibold">Editor invito</h2>

          <label className="mt-3 block text-xs font-medium">Nome sito</label>
          <input
            value={site.name}
            onChange={(e) => update({ name: e.target.value })}
            className="mt-1 w-full rounded-md border border-input px-2 py-1.5 text-sm"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {sites.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActive(s.id);
                  setActiveId(s.id);
                  setScene("cover");
                }}
                className={`rounded-full border px-3 py-1 text-xs ${
                  s.id === activeId ? "border-primary bg-primary/10" : "border-input"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={onDuplicate}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
            >
              <Copy size={14} /> Duplica sito
            </button>
            <button
              onClick={() => {
                const fresh = defaultConfig("Nuovo invito");
                const next = [...sites, fresh];
                setSites(next);
                saveSites(next);
                setActive(fresh.id);
                setActiveId(fresh.id);
              }}
              className="rounded-md border border-input px-3 py-2 text-xs"
            >
              <Plus size={14} />
            </button>
            {sites.length > 1 && (
              <button
                onClick={() => {
                  const next = sites.filter((s) => s.id !== site.id);
                  setSites(next);
                  saveSites(next);
                  setActive(next[0].id);
                  setActiveId(next[0].id);
                }}
                className="rounded-md border border-input px-3 py-2 text-xs text-destructive"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            File
          </h3>
          <div className="mt-2 space-y-2">
            {MEDIA_LABELS.map((m) => (
              <label
                key={m.key}
                className="flex cursor-pointer items-center justify-between rounded-md border border-dashed border-input px-3 py-2 text-xs hover:bg-accent"
              >
                <span>{m.label}</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  {site.media[m.key] ? <Pencil size={14} /> : <Plus size={14} />}
                </span>
                <input
                  type="file"
                  accept={m.accept}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onUpload(m.key, f);
                  }}
                />
              </label>
            ))}
          </div>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Icone e link (trascinabili)
          </h3>
          <div className="mt-2 space-y-3">
            {site.hotspots.map((h) => (
              <div key={h.id} className="rounded-md border border-input p-2">
                <input
                  value={h.label}
                  onChange={(e) =>
                    update({
                      hotspots: site.hotspots.map((x) =>
                        x.id === h.id ? { ...x, label: e.target.value } : x,
                      ),
                    })
                  }
                  className="w-full rounded border border-input px-2 py-1 text-xs"
                />
                <select
                  value={h.action}
                  onChange={(e) =>
                    update({
                      hotspots: site.hotspots.map((x) =>
                        x.id === h.id
                          ? { ...x, action: e.target.value as "dresscode" | "link" }
                          : x,
                      ),
                    })
                  }
                  className="mt-1 w-full rounded border border-input px-2 py-1 text-xs"
                >
                  <option value="link">Apri link</option>
                  <option value="dresscode">Apri dresscode</option>
                </select>
                {h.action === "link" && (
                  <input
                    value={h.url}
                    placeholder="https://..."
                    onChange={(e) =>
                      update({
                        hotspots: site.hotspots.map((x) =>
                          x.id === h.id ? { ...x, url: e.target.value } : x,
                        ),
                      })
                    }
                    className="mt-1 w-full rounded border border-input px-2 py-1 text-xs"
                  />
                )}
                <div className="mt-1 flex gap-1">
                  <input
                    type="number"
                    value={h.width}
                    onChange={(e) =>
                      update({
                        hotspots: site.hotspots.map((x) =>
                          x.id === h.id ? { ...x, width: Number(e.target.value) } : x,
                        ),
                      })
                    }
                    className="w-1/2 rounded border border-input px-2 py-1 text-xs"
                  />
                  <input
                    type="number"
                    value={h.height}
                    onChange={(e) =>
                      update({
                        hotspots: site.hotspots.map((x) =>
                          x.id === h.id ? { ...x, height: Number(e.target.value) } : x,
                        ),
                      })
                    }
                    className="w-1/2 rounded border border-input px-2 py-1 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Testi
          </h3>
          <input
            value={site.texts.open}
            onChange={(e) => update({ texts: { ...site.texts, open: e.target.value } })}
            className="mt-2 w-full rounded-md border border-input px-2 py-1.5 text-sm"
          />
          <input
            value={site.texts.replay}
            onChange={(e) => update({ texts: { ...site.texts, replay: e.target.value } })}
            className="mt-2 w-full rounded-md border border-input px-2 py-1.5 text-sm"
          />
          <input
            value={site.instagram}
            onChange={(e) => update({ instagram: e.target.value })}
            className="mt-2 w-full rounded-md border border-input px-2 py-1.5 text-sm"
            placeholder="Link logo / Instagram"
          />
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            Le modifiche restano su questo dispositivo. Il sito pubblicato resta visibile a tutti
            senza password: solo l'editor richiede il PIN.
          </p>
        </aside>
      )}
    </main>
  );
}

function Slot({
  label,
  accept,
  editMode,
  onFile,
}: {
  label: string;
  accept: string;
  editMode: boolean;
  onFile: (f: File) => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white">
      {editMode ? (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-black/20 px-8 py-6 text-black/60 hover:border-black/40">
          <Plus size={32} />
          <span className="text-xs font-medium">{label}</span>
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>
      ) : null}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, Plus, RotateCcw, X, Copy, Pencil, Trash2 } from "lucide-react";
import {
  type InviteConfig,
  type MediaKey,
  type ButtonTheme,
  defaultConfig,
  getActiveId,
  slugify,
  mediaUrl,
  setActiveId,
  getDefinitiveInviteUrl,
} from "@/lib/invite-store";
import {
  copyMediaFn,
  createUploadFn,
  deleteSiteFn,
  getActiveSiteFn,
  listSitesFn,
  saveSiteFn,
  verifyPinFn,
} from "@/lib/invite.functions";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo.png";

// Logo e link del logo sono fissi: non modificabili dall'editor.
const LOGO_SRC = logoImg;
const LOGO_LINK = "https://instagram.com/invitodigitalebycarli";

const FADE_MS = 1800;

const BADGE_BASE =
  "inline-flex items-center justify-center gap-2 transition-transform active:scale-95";
const BADGE_DARK = `badge-glass ${BADGE_BASE}`;
const BADGE_LIGHT = `badge-glass-light ${BADGE_BASE}`;

const MEDIA_LABELS: { key: MediaKey; label: string; accept: string }[] = [
  { key: "poster", label: "Copertina (immagine)", accept: "image/*" },
  { key: "video", label: "Video animazione", accept: "video/*" },
  { key: "invite", label: "Invito finale (immagine)", accept: "image/*" },
  { key: "dresscode", label: "Dresscode (immagine)", accept: "image/*" },
  { key: "music", label: "Musica (audio)", accept: "audio/*,*/*" },
  { key: "social", label: "Copertina anteprima social", accept: "image/*" },
];

export function InviteApp({
  initialSite = null,
  publicOnly = false,
}: {
  initialSite?: InviteConfig | null;
  publicOnly?: boolean;
}) {
  const [sites, setSites] = useState<InviteConfig[]>(initialSite ? [initialSite] : []);
  const [activeId, setActive] = useState<string | null>(initialSite?.id ?? null);
  const [editMode, setEditMode] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  const [pinOpen, setPinOpen] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinUser, setPinUser] = useState("");
  const [scene, setScene] = useState<"cover" | "video" | "invite">("cover");
  const [dresscodeOpen, setDresscodeOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);
  const [dresscodeMounted, setDresscodeMounted] = useState(false);
  const [dresscodeVisible, setDresscodeVisible] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<string | null>(null);

  const pinRef = useRef<string>("");
  const [pinError, setPinError] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);

  // The PIN is verified only on the server; the client keeps just an opaque session token.
  const tryUnlock = useCallback(
    async (onSuccess?: () => void, openEditor = true) => {
      if (pinBusy) return;
      setPinBusy(true);
      setPinError(false);
      try {
        const { token } = await verifyPinFn({ data: { pin: pinValue, user: pinUser } });
        pinRef.current = token;
        setPinOpen(false);
        setPinValue("");
        setPinUser("");
        setUnlocked(true);
        if (openEditor) setEditMode(true);
        onSuccess?.();
      } catch {
        setPinError(true);
      } finally {
        setPinBusy(false);
      }
    },
    [pinBusy, pinValue, pinUser],
  );
  const pinMode = useRef<"editor" | "save">("editor");
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unlockTap = () => {
    if (unlocked) {
      setEditMode(true);
      return;
    }
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (tapCount.current >= 5) {
      tapCount.current = 0;
      pinMode.current = "editor";
      setPinOpen(true);
      return;
    }
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 2000);
  };

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sitesRef = useRef<InviteConfig[]>([]);
  sitesRef.current = sites;


  useEffect(() => {
    if (publicOnly) return;
    if (unlocked) {
      // Editor sbloccato: carica tutti i siti per la gestione e duplicazione
      void (async () => {
        try {
          const loaded = await listSitesFn();
          setSites(loaded);
          const saved = getActiveId();
          setActive(saved && loaded.some((s) => s.id === saved) ? saved : (loaded[0]?.id ?? null));
        } catch (err) {
          console.error("load failed", err);
        }
      })();
    } else {
      // Visitatore pubblico: carica solo ed esclusivamente il sito attivo/principale
      void (async () => {
        try {
          const res = await getActiveSiteFn({ id: getActiveId() });
          if (res?.site) {
            setSites([res.site]);
            setActive(res.site.id);
          }
        } catch (err) {
          console.error("load active site failed", err);
        }
      })();
    }
  }, [publicOnly, unlocked]);

  const site = sites.find((s) => s.id === activeId) ?? null;
  const buttonTheme: ButtonTheme = site?.buttonTheme ?? "dark";
  const badgeStyle = buttonTheme === "light" ? BADGE_LIGHT : BADGE_DARK;

  const poster = mediaUrl(site?.media.poster);
  const video = mediaUrl(site?.media.video);
  const invite = mediaUrl(site?.media.invite);
  const dresscode = mediaUrl(site?.media.dresscode);
  const music = mediaUrl(site?.media.music);

  // Dissolvenza di apertura/chiusura della finestra dresscode
  useEffect(() => {
    if (dresscodeOpen) {
      setDresscodeMounted(true);
      const id = requestAnimationFrame(() => setDresscodeVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setDresscodeVisible(false);
    const t = setTimeout(() => setDresscodeMounted(false), FADE_MS);
    return () => clearTimeout(t);
  }, [dresscodeOpen]);

  const persist = useCallback(async (next: InviteConfig) => {
    if (!pinRef.current) return;
    try {
      await saveSiteFn({ data: { token: pinRef.current, site: next } });
    } catch (err) {
      console.error("save failed", err);
      alert("Salvataggio online non riuscito. Riprova.");
    }
  }, []);

  const update = useCallback(
    (patch: Partial<InviteConfig>) => {
      setSites((prev) => {
        const next = prev.map((s) => (s.id === activeId ? { ...s, ...patch } : s));
        const current = next.find((s) => s.id === activeId);
        if (current) {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => void persist(current), 500);
        }
        return next;
      });
    },
    [activeId, persist],
  );

  const onUpload = async (key: MediaKey, rawFile: File) => {
    if (!pinRef.current) return;
    try {
      // La copertina social viene compressa: WhatsApp non mostra immagini pesanti.
      const file = key === "social" ? await compressImage(rawFile) : rawFile;
      const ext = file.name.split(".").pop() ?? "bin";
      const { path, token, bucket } = await createUploadFn({
        data: { token: pinRef.current, ext },
      });
      const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file);
      if (error) throw error;

      const current = sitesRef.current.find((s) => s.id === activeId);
      if (!current) return;
      const next: InviteConfig = { ...current, media: { ...current.media, [key]: path } };
      setSites((prev) => prev.map((s) => (s.id === next.id ? next : s)));
      await persist(next);
    } catch (err) {
      console.error("upload failed", err);
      alert("Non è stato possibile caricare il file. Controlla la dimensione (max 50MB).");
    }
  };




  const start = () => {
    if (editMode) return;
    if (replayTimer.current) {
      clearTimeout(replayTimer.current);
      replayTimer.current = null;
    }
    if (video) {
      setScene("video");
      setVideoVisible(true);
      const v = videoRef.current;
      if (v) {
        v.currentTime = 0;
        v.muted = true;
        void v.play().catch(() => undefined);
      }
    } else {
      setScene("invite");
      setInviteVisible(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setInviteVisible(true)));
    }
    const a = audioRef.current;
    if (a) {
      a.volume = 0.4;
      a.currentTime = 0;
      if (!muted) {
        a.muted = false;
        void a.play().catch(() => undefined);
      }
    }
  };

  const onVideoEnd = () => {
    setScene("invite");
    setInviteVisible(false);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setInviteVisible(true);
        setVideoVisible(false);
      }),
    );
  };

  const replayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replay = () => {
    // Dissolvenza fluida in uscita, poi reset completo.
    setDresscodeOpen(false);
    setInviteVisible(false);
    setVideoVisible(false);
    if (replayTimer.current) clearTimeout(replayTimer.current);
    replayTimer.current = setTimeout(() => {
      setScene("cover");
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
    }, FADE_MS);
  };


  const onDuplicate = async () => {
    if (!site || !pinRef.current) return;
    const media: InviteConfig["media"] = {};
    for (const [key, value] of Object.entries(site.media)) {
      if (!value) continue;
      try {
        const res = await copyMediaFn({ data: { token: pinRef.current, path: value } });
        media[key as MediaKey] = res.path;
      } catch (err) {
        console.error("copy failed", err);
      }
    }
    const copy: InviteConfig = {
      ...site,
      id: crypto.randomUUID(),
      name: `${site.name} (copia)`,
      slug: slugify(`${site.slug || site.name || "invito"}-copia-${Math.random().toString(36).slice(2, 6)}`),
      media,
      hotspots: site.hotspots.map((h) => ({ ...h })),
    };
    setSites((prev) => [...prev, copy]);
    setActive(copy.id);
    setActiveId(copy.id);
    await persist(copy);
  };


  // Hotspot dragging (solo per l'editor, anche fuori dal pannello)
  useEffect(() => {
    if (!unlocked || publicOnly) return;

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
  }, [unlocked, publicOnly, site, update]);

  if (!site)
    return (
      <main className="fixed inset-0 bg-black">
        {!publicOnly && (
        <button
          onClick={unlockTap}
          aria-label="Area riservata"
          className="fixed bottom-3 left-3 z-40 p-2 text-white/20 transition-opacity hover:text-white/60"
        >
          <Lock size={14} />
        </button>
        )}
        {!publicOnly && pinOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6">
            <div className="w-full max-w-xs rounded-2xl bg-background p-5 text-foreground shadow-2xl">
              <h2 className="text-base font-semibold">Accesso riservato</h2>
              <input
                value={pinUser}
                onChange={(e) => setPinUser(e.target.value)}
                autoComplete="off"
                className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Utente"
              />
              <input
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value)}
                inputMode="numeric"
                type="password"
                className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="PIN"
              />
              {pinError && (
                <p className="mt-2 text-xs text-red-500">Credenziali non valide. Riprova.</p>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  disabled={pinBusy}
                  onClick={() => {
                    void tryUnlock(() => {
                      const fresh = defaultConfig("Invito");
                      setSites([fresh]);
                      setActive(fresh.id);
                      setActiveId(fresh.id);
                      void persist(fresh);
                    });
                  }}
                  className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {pinBusy ? "Verifica…" : "Entra"}
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
      </main>
    );


  const showInvite = scene === "invite";
  // Solo l'editor sbloccato vede/trascina gli hotspot, anche a pannello chiuso.
  const editable = unlocked && !publicOnly;


  return (
    <main className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
      <div
        ref={stageRef}
        style={{
          width: "min(100vw, calc(100dvh * 9 / 16))",
          height: "min(100dvh, calc(100vw * 16 / 9))",
          aspectRatio: "9 / 16",
        }}
        className="relative overflow-hidden rounded-3xl bg-black shadow-2xl shadow-black/80"
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
            preload="metadata"
            onEnded={onVideoEnd}
            style={{ transitionDuration: videoVisible ? "0ms" : `${FADE_MS}ms` }}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out ${
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
              style={{ transitionDuration: `${FADE_MS}ms` }}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out ${
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
        {(showInvite || editable) &&
          site.hotspots.map((h) => (
            <button
              key={h.id}
              onPointerDown={() => {
                if (editable) dragRef.current = h.id;
              }}
              onClick={() => {
                if (editable) return;
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
                editable
                  ? "z-30 cursor-move border-2 border-dashed border-black/60 bg-white/40 text-[10px] font-semibold text-black"
                  : "z-10"
              }`}
            >
              {editable ? h.label : null}
            </button>
          ))}


        {/* Cover tap */}
        {scene === "cover" && !editMode && (
          <button
            onClick={start}
            style={{ paddingBottom: "calc(25% + 0.5cm)" }}
            className="absolute inset-0 z-10 flex animate-fade-in items-end justify-center"
          >
            <span className={`${badgeStyle} animate-soft-float px-5 py-2.5 text-sm tracking-wide`}>
              {site.texts.open}
            </span>
          </button>
        )}

        {/* Controls */}
        {scene !== "cover" && !editMode && (
          <>
            <button onClick={replay} className={`${badgeStyle} absolute left-4 top-4 z-20 px-4 py-2 text-sm`}>
              <RotateCcw size={16} /> {site.texts.replay}
            </button>
            <button
              onClick={() => {
                const a = audioRef.current;
                if (a) {
                  if (muted) {
                    a.muted = false;
                    void a.play().catch(() => undefined);
                  } else {
                    a.muted = true;
                  }
                }
                setMuted((m) => !m);
              }}
              className={`${badgeStyle} absolute right-4 top-4 z-20 h-10 w-10`}
              aria-label={muted ? "Attiva audio" : "Disattiva audio"}
            >
              <span className="text-base select-none leading-none" role="img" aria-hidden="true">
                {muted ? "🔇" : "🔊"}
              </span>
            </button>
          </>
        )}

        {/* Dresscode overlay */}
        {dresscodeMounted && (
          <div
            onClick={() => setDresscodeOpen(false)}
            style={{ transitionDuration: `${FADE_MS}ms` }}
            className={`absolute inset-0 z-20 flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px] transition-opacity ease-in-out ${
              dresscodeVisible ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {dresscode ? (
              <div
                className="relative flex flex-col items-end max-h-[86vh] max-w-[92vw]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setDresscodeOpen(false)}
                  className={`${badgeStyle} mb-2.5 h-9 w-9 shrink-0 self-end z-10`}
                  aria-label="Chiudi dresscode"
                >
                  <X size={18} />
                </button>
                <img
                  src={dresscode}
                  alt="Dresscode"
                  className="max-h-[76vh] w-auto max-w-full rounded-2xl sm:rounded-3xl object-contain shadow-2xl block"
                />
              </div>
            ) : (
              <div
                className="relative flex flex-col items-end max-w-[90vw]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setDresscodeOpen(false)}
                  className={`${badgeStyle} mb-2.5 h-9 w-9 shrink-0 self-end z-10`}
                  aria-label="Chiudi dresscode"
                >
                  <X size={18} />
                </button>
                <div className="rounded-2xl bg-black/60 p-6 text-center text-white">
                  <p className="text-sm text-white/90">Nessuna immagine dresscode caricata</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer logo (fisso, non modificabile) */}
        <a
          href={LOGO_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 z-10 block h-7 w-7 overflow-hidden rounded-full shadow-md shadow-black/30 ring-1 ring-white/60"
          aria-label="Invito Digitale by Carli"
        >
          <img src={LOGO_SRC} alt="Logo" className="h-full w-full object-cover" />
        </a>

        {music && <audio ref={audioRef} src={music} preload="none" loop />}

        {/* Precaricamento silenzioso: le immagini sono già pronte quando servono */}
        <div aria-hidden className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0">
          {invite && <img src={invite} alt="" fetchPriority="high" />}
          {dresscode && <img src={dresscode} alt="" />}
        </div>
      </div>

      {/* Edit entry */}
      {!publicOnly &&
        (editMode ? (
          <button
            onClick={() => setEditMode(false)}
            className={`${badgeStyle} fixed bottom-4 left-4 z-40 px-4 py-2 text-xs`}
          >
            <X size={14} /> Chiudi editor
          </button>
        ) : (
          <button
            onClick={unlockTap}
            aria-label="Area riservata"
            className="fixed bottom-3 left-3 z-40 p-2 text-white/20 transition-opacity hover:text-white/60"
          >
            <Lock size={14} />
          </button>
        ))}

      {/* Salva (solo editor): richiede il PIN ogni volta */}
      {editable && (
        <button
          onClick={() => {
            pinMode.current = "save";
            setPinError(false);
            setPinValue("");
            setPinOpen(true);
          }}
          className={`${badgeStyle} fixed bottom-4 left-1/2 z-40 -translate-x-1/2 px-4 py-2 text-xs`}
        >
          Salva
        </button>
      )}

      {!publicOnly && pinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6">
          <div className="w-full max-w-xs rounded-2xl bg-background p-5 text-foreground shadow-2xl">
            <h2 className="text-base font-semibold">
              {pinMode.current === "save" ? "Conferma per salvare" : "Accesso riservato"}
            </h2>
            <input
              value={pinUser}
              onChange={(e) => setPinUser(e.target.value)}
              autoComplete="off"
              className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Utente"
            />
            <input
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value)}
              inputMode="numeric"
              type="password"
              className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="PIN"
            />
            {pinError && (
              <p className="mt-2 text-xs text-red-500">Credenziali non valide. Riprova.</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                disabled={pinBusy}
                onClick={() => {
                  const saving = pinMode.current === "save";
                  void tryUnlock(() => {
                    if (saving) {
                      const current = sitesRef.current.find((s) => s.id === activeId);
                      if (current) void persist(current);
                      // Dopo il salvataggio: torna alla versione invitati.
                      setEditMode(false);
                      setUnlocked(false);
                      pinRef.current = "";
                      setDresscodeOpen(false);
                      setInviteVisible(false);
                      setVideoVisible(false);
                      setScene("cover");
                      return;
                    }
                    if (!sitesRef.current.length) {
                      const fresh = defaultConfig("Invito");
                      setSites([fresh]);
                      setActive(fresh.id);
                      setActiveId(fresh.id);
                      void persist(fresh);
                    }
                  }, !saving);
                }}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {pinBusy ? "Verifica…" : pinMode.current === "save" ? "Salva" : "Entra"}
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

          <label className="mt-3 block text-xs font-medium">Indirizzo del link definitivo</label>
          <div className="mt-1 flex gap-2">
            <input
              value={site.slug ?? ""}
              onChange={(e) => update({ slug: slugify(e.target.value) })}
              placeholder="invito-sara"
              className="w-full rounded-md border border-input px-2 py-1.5 text-sm"
            />
            <button
              onClick={() => {
                const url = getDefinitiveInviteUrl(site.slug || site.id);
                void navigator.clipboard?.writeText(url);
                setCopiedFeedback(true);
                setTimeout(() => setCopiedFeedback(false), 2500);
              }}
              className="whitespace-nowrap rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-opacity active:opacity-80"
            >
              {copiedFeedback ? "Copiato! ✓" : "Copia link"}
            </button>
          </div>
          <a
            href={getDefinitiveInviteUrl(site.slug || site.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block truncate text-[11px] text-muted-foreground hover:text-primary underline"
          >
            {getDefinitiveInviteUrl(site.slug || site.id)}
          </a>

          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Colore pulsanti
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => update({ buttonTheme: "dark" })}
              className={`flex items-center justify-center gap-2 rounded-md border p-2 text-xs font-medium transition-colors ${
                (site.buttonTheme ?? "dark") === "dark"
                  ? "border-primary bg-primary text-primary-foreground font-semibold"
                  : "border-input bg-background hover:bg-accent"
              }`}
            >
              <span className="h-3 w-3 rounded-full bg-black border border-white/40 shadow-sm" />
              Scuro
            </button>
            <button
              type="button"
              onClick={() => update({ buttonTheme: "light" })}
              className={`flex items-center justify-center gap-2 rounded-md border p-2 text-xs font-medium transition-colors ${
                site.buttonTheme === "light"
                  ? "border-primary bg-primary text-primary-foreground font-semibold"
                  : "border-input bg-background hover:bg-accent"
              }`}
            >
              <span className="h-3 w-3 rounded-full bg-white border border-black/40 shadow-sm" />
              Chiaro
            </button>
          </div>

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
                setSites((prev) => [...prev, fresh]);
                setActive(fresh.id);
                setActiveId(fresh.id);
                void persist(fresh);
              }}
              className="rounded-md border border-input px-3 py-2 text-xs"
            >
              <Plus size={14} />
            </button>
            {sites.length > 1 && (
              <button
                onClick={() => {
                  if (!window.confirm(`Sei sicuro di voler eliminare l'invito "${site.name}"? L'operazione non è reversibile.`)) return;
                  const removed = site.id;
                  const next = sites.filter((s) => s.id !== removed);
                  setSites(next);
                  if (next[0]) {
                    setActive(next[0].id);
                    setActiveId(next[0].id);
                  }
                  if (pinRef.current) {
                    void deleteSiteFn({ data: { token: pinRef.current, id: removed } });
                  }
                }}
                className="rounded-md border border-input px-3 py-2 text-xs text-destructive hover:bg-destructive/10"
                aria-label="Elimina invito"
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
                    e.target.value = "";
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
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            Le modifiche e i file sono salvati online: chi apre il sito pubblicato vede tutto,
            senza password. Solo l'editor richiede il PIN.
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
              e.target.value = "";
              if (f) onFile(f);
            }}

          />
        </label>
      ) : null}
    </div>
  );
}

// Comprime le immagini (usata per la copertina social: WhatsApp ignora i file pesanti).
async function compressImage(file: File, maxSide = 1200, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || typeof document === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

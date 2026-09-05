# Sito INVITI STUDIO by Carli

CREA UN SITO VUOTO CHE POSSO MODIFICARE E DUPLICARE DA LÌ, DEVO POTER INSERIRE LE IMMAGINI, VIDEO E QUALUNQUE TIPO DI FILE, DEVONO SEMPRE RESTARE IDENTICHE LE CARATTERISTICHE (ANIMAZIONI, CASELLE DI TESTO, TASTO AUDIO E LOGO CHE TI FORNISCO IO), DEVO POTER INSERIRE I LINK ALLE ICONE CHE CI SARANNO NELLE IMMAGINI, E DEVO POTER INSERIRE ANCHE LA FINESTRA PER IL DRESSCODE (IMG).

IL SITO DEVE ESSERE BIANCO CON DEI + PER AGGIUNGERE IMMAGINI/VIDEO/FILE DI OGNI TIPO ED ESSERE MODIFICABILE DALL’INTERNO DA ME

LE TRE ICONE TRASPARENTI IN CUI DEVO INSERIRE I LINK DEVONO ESSERE SPOSTABILI E POI VORREI CHE CI FOSSE IL TASTO DUPLICA SITO, IL SITO DEVE ESSERE SOLO ACCESSIBILE E MODIFICABILE DA ME CON PIN: 236486, QUANDO PUBBLICO IL SITO DEVE ESSERE VISIBILE AGLI ALTRI SENZA PASSWORD 

QUESTO È IL PROMPT
Crea un'applicazione web single-page con TanStack Start, React 19, TypeScript e Tailwind CSS v4, con layout fisso full-bleed senza scroll (body { overflow: hidden; overscroll-behavior: none; }).
Layout generale
	•	<main> fisso a schermo intero: fixed inset-0 overflow-hidden bg-black.
	•	Contenitore interno centrato con aspect ratio 9:16: relative mx-auto h-full w-full max-w-[calc(100dvh*9/16)](larghezza massima = altezza viewport × 9/16, bande nere ai lati su schermi larghi).
Asset
	•	busta_poster.jpg — primo frame del video, usato come cover statica.
	•	video_busta.mp4 — video animazione busta (~5,9 s).
	•	invito_finale.jpg — immagine finale dell'invito (non modificabile).
	•	dresscode.png — finestra dresscode 
	•	logo-studio.png — logo circolare Instagram.
	•	musica.mp3 — musica di sottofondo in loop.
Scena 1 — Cover
	•	Immagine poster a schermo intero: absolute inset-0 h-full w-full object-cover, fetchPriority="high", sempre visibile sotto al video.
	•	Bottone "Tocca per aprire" su tutta la cover (absolute inset-0), con badge posizionato in basso al centro: flex items-end justify-center pb-[25%], animazione animate-fade-in.
	•	Stile badge: rounded-full bg-black/45 text-white font-bold backdrop-blur-md shadow-lg shadow-black/30 ring-1 ring-white/15, testo text-sm tracking-wide, padding px-5 py-2.5, animazione fluttuante animate-soft-float (su e giù di 8px, 2,6 s ease-in-out infinite).
Scena 2 — Video
	•	Al click sulla cover: parte il video in autoplay, sovrapposto alla cover (absolute inset-0 object-cover, stesso poster per evitare flash), opacità con transition-opacity duration-[600ms].
	•	Attributi video: muted, playsInline, preload="auto", playbackRate = 1.
	•	Pre-warm decoder con video.load() al mount; retry automatico su play()fallito (fino a 8 tentativi, 200 ms); rilevamento stalli ogni 700 ms con forzatura della ripresa.
	•	Al termine del video: passa alla scena invito.
Scena 3 — Invito finale
	•	Immagine invito_finale.jpg a schermo intero con fade-in di 3500 ms(transition-opacity ease-out); il video sfuma e viene nascosto dopo 3500 ms.
	•	Tre hotspot invisibili (absolute rounded-full, feedback active:opacity-40), posizionati con top: 64.2%, width: 15%, height: 8.5%, transform: translate(-50%, -50%):
	•	Sinistra (left: 31.9%) → apre overlay dresscode.
	•	Centro (left: 48.8%) → link Google Maps (Ristorante Villa Desiderio), target="_blank".
	•	Destra (left: 65.7%) → link Google Forms per conferma presenza (https://forms.gle/P6zVe6tgjWskmnsx5), target="_blank".
Overlay Dresscode
	•	Sfondo absolute inset-0 z-20 bg-black/70 backdrop-blur-sm, fade 300 ms, click fuori per chiudere.
	•	Immagine dresscode: max-h-[78%] w-full rounded-3xl object-contain shadow-2xl, con padding laterale px-5.
	•	Bottone chiusura "X" in alto a destra con lo stesso stile badge nero.
Controlli (visibili dopo l'apertura)
	•	In alto a sinistra: badge "Riguarda" con icona RotateCcw (16px), absolute left-4 top-4 px-4 py-2 text-sm, stesso stile badge. Al click: fade-out dell'invito di 1200 ms, stop e reset di musica e video, ritorno alla cover, chiusura dresscode.
	•	In alto a destra: badge circolare mute/unmute absolute right-4 top-4 h-10 w-10, icone Volume2/VolumeX(20px), stesso stile badge.
Stile badge condiviso (Tocca per aprire, Riguarda, X, musica): rounded-full bg-black/45 text-white font-bold backdrop-blur-md shadow-lg shadow-black/30 ring-1 ring-white/15.
Audio
	•	All'apertura parte musica.mp3 in loop, volume 0.4, da currentTime = 0.
	•	"Riguarda" ferma e resetta la musica; il toggle silenzia/riattiva senza fermarla.
Footer
	•	In basso a destra: logo h-7 w-7 (28px) rotondo (overflow-hidden rounded-full ring-1 ring-white/60 shadow-md shadow-black/30), link a Instagram @invitodigitalebycarli, z-10, bottom-3 right-3.
Animazioni CSS (styles.css)
	•	@keyframes soft-float: translateY(0) → translateY(-8px) → 0; utility animate-soft-float 2.6 s ease-in-out infinite.
	•	animate-fade-in da tw-animate-css.
	•	Regola globale: #lovable-badge { display: none !important; }.
	•	Design tokens shadcn standard (colori oklch), ma la pagina è interamente nera/immagini.
Meta/SEO
	•	Open Graph + Twitter card summary_large_image con og:imageassoluto: https://invito-sara.lovable.app/sara-invito-social.jpg?v=2 (JPEG 1200×675), più og:image:secure_url, type, width, height, alt; og:url e canonical su https://invito-sara.lovable.app/; preload del poster con fetchpriority="high".
Performance
	•	Precaricamento di tutte le immagini al mount via new Image().
	•	Poster sempre sotto al video per transizioni senza flash.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://invitistudiobycarli.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/af73fc36-929c-4b55-826c-02eef9a5e53e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

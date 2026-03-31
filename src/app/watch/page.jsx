"use client";

import {
  Suspense,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Star,
  Users,
  Loader2,
  Cloud,
  List as ListIcon,
} from "lucide-react";
import Loading from "@/components/Loading";
import Image from "next/image";
import {
  serverOptions,
  buildEmbedUrl,
  detectServer,
} from "@/lib/videoResolver";
import { createRoom } from "@/features/room/createRoom";
import { ls } from "@/utils/localStorage";

import VideoPlayer from "@/features/video";
import EpisodeSelector from "@/features/content/EpisodeSelector";

function WatchContent() {
  const params = useSearchParams();
  const router = useRouter();
  const videoRef = useRef(null);

  const url = params.get("url") || "";
  const tmdbId = params.get("tmdb") || "";
  const type = params.get("type") || "movie";
  const s = params.get("s") || 1;
  const e = params.get("e") || 1;

  const [meta, setMeta] = useState(null);
  const [showBar, setShowBar] = useState(true);
  const [creating, setCreating] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [episodesOpen, setEpisodesOpen] = useState(false);
  const [seasonCache, setSeasonCache] = useState({});

  const derivedMeta = useMemo(() => {
    if (!url) return { id: tmdbId, s, e, type };
    const vidlinkMatch = url.match(/\/tv\/(\d+)\/(\d+)\/(\d+)/);
    if (vidlinkMatch) {
      return {
        id: vidlinkMatch[1],
        s: vidlinkMatch[2],
        e: vidlinkMatch[3],
        type: "tv",
      };
    }
    const tmdbMatch = url.match(/[?&]tmdb=(\d+)/) || url.match(/\/tv\/(\d+)/);
    if (tmdbMatch) return { id: tmdbMatch[1], s, e, type: "tv" };
    return { id: tmdbId, s, e, type };
  }, [url, tmdbId, s, e, type]);

  const {
    id: activeTmdbId,
    s: activeS,
    e: activeE,
    type: metaType,
  } = derivedMeta;
  const isActiveTv = metaType === "tv";

  // ── Side-effects ─────────────────────────────────────────────────────────────

  const cloudRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (ev) => {
      if (cloudRef.current && !cloudRef.current.contains(ev.target))
        setCloudOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    let timer;
    const reset = () => {
      setShowBar(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShowBar(false), 3000);
    };
    window.addEventListener("mousemove", reset);
    reset();
    return () => {
      window.removeEventListener("mousemove", reset);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!activeTmdbId) return;
    fetch(
      `/api/tmdb/${derivedMeta.type || type}/${encodeURIComponent(activeTmdbId)}`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setMeta(d);
      })
      .catch(() => {});
  }, [activeTmdbId, derivedMeta.type, type]);

  const navigateToEpisode = useCallback(
    (season, episode) => {
      if (!activeTmdbId) return;
      const server = detectServer(url);
      if (server) {
        const newUrl = buildEmbedUrl(
          server,
          activeTmdbId,
          "tv",
          season,
          episode,
        );
        if (newUrl) {
          router.replace(
            `/watch?url=${encodeURIComponent(newUrl)}&tmdb=${activeTmdbId}&type=tv&s=${season}&e=${episode}`,
          );
          return;
        }
      }
      router.replace(
        `/watch?url=${encodeURIComponent(url)}&tmdb=${activeTmdbId}&type=tv&s=${season}&e=${episode}`,
      );
    },
    [url, activeTmdbId, router],
  );

  const handleSelectEpisode = useCallback(
    (newSeason, newEpisode) => {
      navigateToEpisode(newSeason, newEpisode);
      setEpisodesOpen(false);
    },
    [navigateToEpisode],
  );

  if (!url) {
    return (
      <div className="h-dvh bg-[var(--color-void)] flex flex-col items-center justify-center gap-4">
        <p className="text-white/60 font-mono text-sm">
          No video URL provided.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-2.5 rounded-full bg-amber text-[var(--color-void)] font-bold text-sm cursor-pointer hover:bg-amber transition-all font-body active:scale-95"
        >
          Go Home
        </button>
      </div>
    );
  }

  const genres = (meta?.genres || []).slice(0, 3);

  return (
    <div className="h-dvh bg-void flex flex-col overflow-hidden relative">
      <div
        onMouseEnter={() => setShowBar(true)}
        className="fixed top-0 left-0 right-0 h-16 z-[60] pointer-events-auto"
      />

      <div
        className={`fixed top-0 left-0 right-0 z-[70] px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-b from-black/95 via-black/50 to-transparent flex items-center gap-2 sm:gap-3 transition-all duration-500 transform ${
          showBar
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <button
          onClick={() => router.push("/")}
          className="flex items-center justify-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[var(--radius-pill)] w-9 sm:w-auto px-0 sm:px-4 h-9 text-white/50 cursor-pointer font-body text-[12px] font-black hover:bg-white/10 hover:text-white transition-all active:scale-95 group shrink-0"
        >
          <ArrowLeft className="w-4 h-4 sm:group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline">Back</span>
        </button>

        {meta && (
          <div className="flex items-center gap-2.5 sm:gap-3 ml-1 sm:ml-2 animate-in fade-in slide-in-from-top-2 duration-700 min-w-0">
            {meta.poster && (
              <Image
                src={meta.poster}
                alt=""
                width={28}
                height={40}
                className="w-7 sm:w-8 h-10 sm:h-11 object-cover rounded-md shadow-2xl border border-white/10 shrink-0"
              />
            )}
            <div className="flex flex-col justify-center min-w-0">
              <p className="text-[13px] sm:text-[14px] font-black text-bright font-display leading-tight tracking-tight truncate">
                {meta.title}
              </p>
              <div className="hidden sm:flex gap-2 items-center mt-0.5">
                {meta.rating && (
                  <span className="text-[10px] text-amber font-mono flex items-center gap-1 font-black">
                    <Star className="w-2.5 h-2.5 fill-amber" /> {meta.rating}
                  </span>
                )}
                {meta.year && (
                  <span className="text-[10px] text-white/40 font-mono font-bold">
                    {meta.year}
                  </span>
                )}
                <div className="flex gap-2">
                  {genres.map((g) => (
                    <span
                      key={g}
                      className="text-[9px] text-white/30 font-mono uppercase tracking-[0.1em] font-black"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1" />

        <div className="flex items-stretch border border-amber/20 rounded-[var(--radius-pill)] bg-amber/5 backdrop-blur-xl transition-all shadow-2xl hover:border-amber/40 hover:bg-amber/10 shrink-0">
          <button
            disabled={creating}
            onClick={async () => {
              setCreating(true);
              try {
                const { roomId } = await createRoom(url);
                router.push(
                  `/room/${roomId}?url=${encodeURIComponent(url)}&tmdb=${tmdbId}&type=${type}`,
                );
              } catch {
                setCreating(false);
              }
            }}
            className="flex items-center justify-center gap-2 px-3 sm:px-5 h-9 text-amber cursor-pointer font-body text-[12px] font-black transition-all active:scale-[0.98] disabled:opacity-50 rounded-l-[var(--radius-pill)]"
          >
            {creating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Watch Together</span>
          </button>

          <div
            className="relative flex items-stretch pointer-events-auto border-l border-amber/10"
            ref={cloudRef}
          >
            <button
              onClick={() => setCloudOpen(!cloudOpen)}
              className="px-3 sm:px-3.5 h-9 text-amber cursor-pointer font-body hover:bg-white/10 transition-all active:scale-[0.98] flex items-center justify-center border-r border-amber/10"
              title="Change Server"
            >
              <Cloud className="w-4 h-4" strokeWidth={2.5} />
            </button>

            {isActiveTv && (
              <button
                onClick={() => setEpisodesOpen(!episodesOpen)}
                className={`px-3 sm:px-3.5 h-9 cursor-pointer font-body transition-all active:scale-[0.98] flex items-center justify-center rounded-r-[var(--radius-pill)] ${
                  episodesOpen
                    ? "bg-amber/20 text-amber"
                    : "text-amber hover:bg-white/10"
                }`}
                title="Episodes"
              >
                <ListIcon className="w-4 h-4" strokeWidth={2.5} />
              </button>
            )}

            {cloudOpen && (
              <div className="absolute top-full right-0 mt-3 w-[160px] p-1.5 flex flex-col gap-0.5 rounded-xl border border-white/10 glass-card bg-void/90 backdrop-blur-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                <div className="px-2 py-1 mb-1 text-[8px] font-black text-[var(--color-muted)] uppercase tracking-wider font-mono">
                  Select Provider
                </div>
                {serverOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      const newUrl = buildEmbedUrl(
                        opt.value,
                        activeTmdbId,
                        isActiveTv ? "tv" : "movie",
                        activeS,
                        activeE,
                      );
                      setCloudOpen(false);
                      if (newUrl) {
                        router.replace(
                          `/watch?url=${encodeURIComponent(newUrl)}&tmdb=${activeTmdbId}&type=${isActiveTv ? "tv" : "movie"}&s=${activeS}&e=${activeE}`,
                        );
                      }
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-md text-[10px] font-bold tracking-wide transition-colors flex items-center justify-between text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 relative bg-void">
        <VideoPlayer
          videoRef={videoRef}
          videoUrl={url}
          isHost={true}
          isPlaying={true}
          hasEpisodes={isActiveTv}
          onToggleEpisodes={() => setEpisodesOpen(!episodesOpen)}
        />

        {episodesOpen && activeTmdbId && (
          <EpisodeSelector
            tmdbId={activeTmdbId}
            currentSeason={activeS}
            currentEpisode={activeE}
            totalSeasons={meta?.number_of_seasons || null}
            onSelectEpisode={handleSelectEpisode}
            onClose={() => setEpisodesOpen(false)}
            cache={seasonCache}
            setCache={setSeasonCache}
          />
        )}
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<Loading />}>
      <WatchContent />
    </Suspense>
  );
}

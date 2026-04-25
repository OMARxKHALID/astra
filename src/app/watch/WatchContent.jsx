"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ToastContainer, { useToast } from "@/components/Toast";
import AutoNextOverlay from "@/components/AutoNextOverlay";
import Button from "@/components/ui/Button";
import {
  buildEmbedUrl,
  detectServer,
  extractMeta,
  getNextEpisode,
  getLastPosition,
} from "@/lib/videoResolver";
import { createRoom } from "@/features/room/services/createRoom";
import { useBingeWatch } from "@/features/content/hooks/useBingeWatch";
import { persistence } from "@/utils/persistence";

const VideoPlayer = dynamic(() => import("@/features/video"), { ssr: false });
const EpisodeSelector = dynamic(
  () => import("@/features/content/components/EpisodeSelector"),
  { ssr: false },
);
const WatchHeader = dynamic(
  () => import("@/features/content/components/WatchHeader"),
  { ssr: false },
);

export default function WatchContent({ initialMeta }) {
  const params = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { toasts, addToast } = useToast();
  const videoRef = useRef(null);

  const url = params.get("url") || "";
  const tmdbId = params.get("tmdb") || "";
  const type = params.get("type") || "movie";
  const s = params.get("s") || 1;
  const e = params.get("e") || 1;

  const [meta, setMeta] = useState(initialMeta);
  const [showBar, setShowBar] = useState(true);
  const [creating, setCreating] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [episodesOpen, setEpisodesOpen] = useState(false);
  const [seasonCache, setSeasonCache] = useState({});
  const [bingeWatchEnabled, handleToggleBinge] = useBingeWatch(addToast);
  const [autoNextUrl, setAutoNextUrl] = useState(null);

  const derivedMeta = useMemo(() => {
    const meta = extractMeta(url);
    if (meta.id) return meta;
    return { id: tmdbId, s, e, type };
  }, [url, tmdbId, s, e, type]);

  const {
    id: activeTmdbId,
    s: activeS,
    e: activeE,
    type: metaType,
  } = derivedMeta;
  const isActiveTv = metaType === "tv";

  const cloudRef = useRef(null);

  useEffect(() => {
    if (!url || !activeTmdbId) return;
    persistence.saveToHistory(url, activeTmdbId, getLastPosition(url) || 0);
  }, [url, activeTmdbId]);

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

  // Sync meta if initialMeta changes or is missing
  useEffect(() => {
    if (initialMeta) {
      setMeta(initialMeta);
    } else if (activeTmdbId) {
       fetch(
        `/api/tmdb/${derivedMeta.type || type}/${encodeURIComponent(activeTmdbId)}`,
      )
        .then((r) => r.json())
        .then((res) => {
          if (res.success) setMeta(res.data);
        })
        .catch(() => {});
    }
  }, [initialMeta, activeTmdbId, derivedMeta.type, type]);

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
      setAutoNextUrl(null);
      navigateToEpisode(newSeason, newEpisode);
      setEpisodesOpen(false);
    },
    [navigateToEpisode],
  );


  const handleCreateRoom = useCallback(async () => {
    setCreating(true);
    try {
      const { roomId, createPromise } = createRoom(url, session);
      await createPromise;
      router.push(
        `/room/${roomId}?url=${encodeURIComponent(url)}&tmdb=${tmdbId}&type=${type}&h=1`,
      );
    } catch (err) {
      console.error("Failed to sync room", err);
      setCreating(false);
    }
  }, [url, tmdbId, type, router, session]);

  const handleTimeUpdate = useCallback((currentTime) => {
    if (!url || currentTime < 5) return;
    persistence.saveToHistory(url, activeTmdbId, currentTime);
  }, [url, activeTmdbId]);

  const handlePlay = useCallback((time) => {
    handleTimeUpdate(time);
  }, [handleTimeUpdate]);

  const handlePause = useCallback((time) => {
    handleTimeUpdate(time);
  }, [handleTimeUpdate]);

  const handleServerChange = useCallback((newServerValue) => {
    const newUrl = buildEmbedUrl(
      newServerValue,
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
  }, [activeTmdbId, isActiveTv, activeS, activeE, router]);

  const handleVideoEnded = useCallback(() => {
    if (!bingeWatchEnabled || !isActiveTv || !activeTmdbId) return;
    const next = getNextEpisode(url);
    if (next) {
      setAutoNextUrl(next);
    }
  }, [bingeWatchEnabled, isActiveTv, activeTmdbId, url, addToast]);

  const handleAutoNextConfirm = useCallback(() => {
    if (!autoNextUrl) return;
    const next = autoNextUrl;
    setAutoNextUrl(null);
    const nextMeta = extractMeta(next);
    router.replace(
      `/watch?url=${encodeURIComponent(next)}&tmdb=${activeTmdbId}&type=tv&s=${nextMeta.s || activeS}&e=${nextMeta.e || Number(activeE) + 1}`,
    );
  }, [autoNextUrl, activeTmdbId, activeS, activeE, router]);

  const handleAutoNextCancel = useCallback(() => {
    setAutoNextUrl(null);
  }, []);

  if (!url) {
    return (
      <div className="h-dvh bg-void flex flex-col items-center justify-center gap-4">
        <p className="text-white/60 font-mono text-sm">
          No video URL provided.
        </p>
        <Button onClick={() => router.push("/")} className="px-7 rounded-full">
          Go Home
        </Button>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-void flex flex-col overflow-hidden relative">
      <div
        onMouseEnter={() => setShowBar(true)}
        className="fixed top-0 left-0 right-0 h-16 z-[60] pointer-events-auto"
      />

      <div ref={cloudRef}>
        <WatchHeader
          visible={showBar}
          meta={meta}
          creating={creating}
          onSync={handleCreateRoom}
          cloudOpen={cloudOpen}
          setCloudOpen={setCloudOpen}
          episodesOpen={episodesOpen}
          onToggleEpisodes={() => setEpisodesOpen(!episodesOpen)}
          isActiveTv={isActiveTv}
          url={url}
          onServerChange={handleServerChange}
        />
      </div>

      <div className="flex-1 relative bg-void">
        <VideoPlayer
          videoRef={videoRef}
          videoUrl={url}
          isHost={true}
          isPlaying={true}
          hasEpisodes={isActiveTv}
          onToggleEpisodes={() => setEpisodesOpen(!episodesOpen)}
          onEnded={handleVideoEnded}
          onPlay={handlePlay}
          onPause={handlePause}
          initialTime={getLastPosition(url) || 0}
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
            poster={meta?.poster || null}
            bingeWatchEnabled={bingeWatchEnabled}
            onToggleBingeWatch={handleToggleBinge}
          />
        )}
      </div>

      {autoNextUrl && (
        <AutoNextOverlay
          episodeLabel={`Episode ${Number(activeE) + 1}`}
          onConfirm={handleAutoNextConfirm}
          onCancel={handleAutoNextCancel}
        />
      )}
      <ToastContainer toasts={toasts} />
    </div>
  );
}

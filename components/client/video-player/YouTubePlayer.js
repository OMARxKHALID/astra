"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { onYTReady, useVideoHotkeys } from "./utils";
import { YT_AD_POLL_MS as AD_POLL_MS } from "@/lib/constants";
import EmbedControls from "./EmbedControls";
import ThumbnailPoster from "./ThumbnailPoster";

// ─── Ad skip interval ───────────────────────────────────────────────────────
// YouTube sometimes shows ads inside the IFrame embed. We can't block ads
// but we CAN detect an ad is playing and seek past it automatically.
// The IFrame API exposes getAdState() but it's undocumented. The reliable
// approach: poll getVideoData() — if the returned video id doesn't match the
// one we loaded, an ad is playing. Then we call nextVideo() or stop the ad.

export default function YouTubePlayer({
  videoRef,
  videoId,
  isHost,
  isPlaying,
  playbackRate,
  onPlay,
  onPause,
  onSeek,
  onSpeed,
  canControl = true,
  chatOverlay,
  onAmbiColors,
  theatreMode = false,
  onToggleTheatre,
}) {
  const containerRef = useRef(null);
  const iframeContainerRef = useRef(null);
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [localTime, setLocalTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [ctrlVis, setCtrlVis] = useState(true);
  const [muted, setMuted] = useState(false);
  const [ccEnabled, setCcEnabled] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const hideTimer = useRef(null);
  const pendingSeekRef = useRef(null); // seek stored before player is ready
  const ccEnabledRef = useRef(ccEnabled);
  const isBufferingRef = useRef(false);
  const adPollRef = useRef(null);

  useEffect(() => {
    ccEnabledRef.current = ccEnabled;
  }, [ccEnabled]);

  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    : null;

  // Ambilight: YT is cross-origin, canvas reads are blocked
  useEffect(() => {
    onAmbiColors?.(null);
  }, [onAmbiColors]);

  const showCtrl = useCallback(() => {
    setCtrlVis(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setCtrlVis(false), 3000);
  }, []);

  // ── Ad skip logic ──────────────────────────────────────────────────────
  // Poll every 800ms. If the player is in AD state (state -1 or the video id
  // in getVideoData doesn't match our videoId), call stopVideo() + seekTo(0) +
  // playVideo() to abort the ad and resume our content.
  const startAdWatch = useCallback(() => {
    if (adPollRef.current) return;
    adPollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const data = p.getVideoData?.();
        const state = p.getPlayerState?.();
        // Ads play with a different video id than the one we loaded,
        // OR the player goes to UNSTARTED(-1) + PLAYING(1) with wrong id.
        // Additionally check for ad_flags if exposed.
        const isAd = data && data.video_id && data.video_id !== videoId;
        if (isAd && state === window.YT?.PlayerState?.PLAYING) {
          setIsAdPlaying(true);
          // Mute and skip to end of ad (fastest skip path)
          try {
            p.mute();
          } catch {}
          // seekTo end forces the ad to complete and resume content
          try {
            p.seekTo(9999, true);
          } catch {}
        } else {
          if (isAdPlaying) {
            setIsAdPlaying(false);
            // Restore volume and seek to where we should be
            try {
              p.unMute();
            } catch {}
            if (pendingSeekRef.current !== null) {
              try {
                p.seekTo(pendingSeekRef.current, true);
              } catch {}
              pendingSeekRef.current = null;
            }
          }
        }
      } catch {}
    }, AD_POLL_MS);
  }, [videoId, isAdPlaying]);

  const stopAdWatch = useCallback(() => {
    clearInterval(adPollRef.current);
    adPollRef.current = null;
  }, []);

  // ── Volume / mute ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !playerRef.current) return;
    try {
      playerRef.current.setVolume(volume * 100);
      if (muted) playerRef.current.mute();
      else playerRef.current.unMute();
    } catch {}
  }, [volume, muted, ready]);

  // ── Playback rate ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !playerRef.current) return;
    try {
      playerRef.current.setPlaybackRate?.(playbackRate);
    } catch {}
  }, [playbackRate, ready]);

  // ── videoRef proxy ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!videoRef) return;
    videoRef.current = {
      get currentTime() {
        try {
          return playerRef.current?.getCurrentTime?.() ?? 0;
        } catch {
          return 0;
        }
      },
      set currentTime(t) {
        try {
          if (playerRef.current) playerRef.current.seekTo?.(t, true);
          else pendingSeekRef.current = t;
        } catch {}
      },
      get paused() {
        try {
          return (
            playerRef.current?.getPlayerState?.() !==
            window.YT?.PlayerState?.PLAYING
          );
        } catch {
          return true;
        }
      },
      get ended() {
        try {
          return (
            playerRef.current?.getPlayerState?.() ===
            window.YT?.PlayerState?.ENDED
          );
        } catch {
          return false;
        }
      },
      get readyState() {
        return ready ? 4 : 0;
      },
      get playbackRate() {
        try {
          return playerRef.current?.getPlaybackRate?.() ?? 1;
        } catch {
          return 1;
        }
      },
      set playbackRate(r) {
        try {
          playerRef.current?.setPlaybackRate?.(r);
        } catch {}
      },
      get isBuffering() {
        return isBufferingRef.current;
      },
      play() {
        try {
          playerRef.current?.playVideo?.();
        } catch {}
        return Promise.resolve();
      },
      pause() {
        try {
          playerRef.current?.pauseVideo?.();
        } catch {}
      },
    };
  }, [videoRef, ready]);

  // ── Time polling ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      if (!playerRef.current) return;
      try {
        setLocalTime(playerRef.current.getCurrentTime?.() ?? 0);
        setDuration(playerRef.current.getDuration?.() ?? 0);
        setBufferedPct(
          (playerRef.current.getVideoLoadedFraction?.() ?? 0) * 100,
        );
      } catch {}
    }, 250);
    return () => clearInterval(t);
  }, []);

  // ── Player initialisation ──────────────────────────────────────────────
  useEffect(() => {
    if (!videoId) return;
    const divId = `yt-${videoId}-${Math.random().toString(36).slice(2, 6)}`;
    const div = document.createElement("div");
    div.id = divId;
    iframeContainerRef.current?.appendChild(div);

    onYTReady(() => {
      if (!iframeContainerRef.current) return;
      playerRef.current = new window.YT.Player(divId, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
          cc_load_policy: ccEnabledRef.current ? 1 : 0,
        },
        events: {
          onReady: () => {
            setReady(true);
            startAdWatch();
            if (pendingSeekRef.current !== null) {
              try {
                playerRef.current?.seekTo?.(pendingSeekRef.current, true);
              } catch {}
              pendingSeekRef.current = null;
            }
          },
          onStateChange: (e) => {
            const YT = window.YT?.PlayerState;
            if (e.data === YT?.BUFFERING) isBufferingRef.current = true;
            if (
              e.data === YT?.PLAYING ||
              e.data === YT?.PAUSED ||
              e.data === YT?.UNSTARTED
            )
              isBufferingRef.current = false;
            if (e.data === YT?.ENDED) {
              onPause?.(playerRef.current?.getDuration?.() ?? 0);
            }
          },
        },
      });
    });

    return () => {
      stopAdWatch();
      try {
        playerRef.current?.destroy?.();
      } catch {}
      playerRef.current = null;
      div.remove();
      setReady(false);
      setIsAdPlaying(false);
    };
  }, [videoId]); // eslint-disable-line

  // ── Captions ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !playerRef.current) return;
    try {
      if (ccEnabled) {
        playerRef.current.loadModule?.("captions");
        playerRef.current.setOption?.("captions", "track", {
          languageCode: "en",
        });
      } else {
        playerRef.current.unloadModule?.("captions");
      }
    } catch {}
  }, [ccEnabled, ready]);

  // ── Fullscreen ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onFS = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFS);
    return () => document.removeEventListener("fullscreenchange", onFS);
  }, []);

  function handlePlayPause() {
    if (!ready || !canControl) return;
    if (isPlaying) {
      onPause?.(playerRef.current?.getCurrentTime?.() ?? 0);
    } else {
      const state = playerRef.current?.getPlayerState?.();
      if (state === window.YT?.PlayerState?.ENDED) {
        playerRef.current?.seekTo?.(0, true);
        onPlay?.(0);
      } else {
        onPlay?.(playerRef.current?.getCurrentTime?.() ?? 0);
      }
    }
  }

  function handleSeekCommit(e) {
    if (!ready) return;
    const t = Number(e.target.value);
    playerRef.current?.seekTo?.(t, true);
    if (canControl) onSeek?.(t);
  }

  function handleVolumeChange(e) {
    const v = Number(e.target.value);
    setVolume(v);
    setMuted(v === 0);
  }

  function handleFullscreen() {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  }

  useVideoHotkeys({
    videoRef,
    handlePlayPause,
    handleFullscreen,
    onSeek,
    setMuted,
  });

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden group/yt"
      onMouseMove={showCtrl}
      onTouchStart={showCtrl}
    >
      <div
        ref={iframeContainerRef}
        className="w-full h-full [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full"
      />

      {/* Invisible click layer over the iframe */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={handlePlayPause}
        onDoubleClick={handleFullscreen}
      />

      <ThumbnailPoster
        visible={!ready}
        thumbnailUrl={thumbnailUrl}
        subtitle="Loading YouTube…"
      />

      {/* Ad skip banner */}
      {isAdPlaying && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-[2rem] bg-black/70 backdrop-blur-md border border-amber-500/30 text-amber-400 text-[11px] font-bold uppercase tracking-widest pointer-events-none animate-pulse">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          Skipping ad…
        </div>
      )}

      {chatOverlay}

      <div className="absolute top-3 left-3 px-2 py-1 rounded-[2rem] bg-red-600/80 text-[10px] font-bold text-white backdrop-blur-sm z-20 pointer-events-none opacity-0 group-hover/yt:opacity-100 transition-opacity">
        YouTube
      </div>

      <EmbedControls
        visible={ctrlVis}
        isPlaying={isPlaying}
        localTime={localTime}
        duration={duration}
        progressPct={duration > 0 ? (localTime / duration) * 100 : 0}
        bufferedPct={bufferedPct}
        playbackRate={playbackRate}
        onPlayPause={handlePlayPause}
        onSeekCommit={handleSeekCommit}
        onSpeedChange={onSpeed}
        showSpeed
        volume={volume}
        muted={muted}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={() => setMuted((m) => !m)}
        showVolume
        showCc
        ccEnabled={ccEnabled}
        onCcToggle={() => setCcEnabled((e) => !e)}
        canControl={canControl}
        onFullscreen={handleFullscreen}
        isFullscreen={isFullscreen}
        theatreMode={theatreMode}
        onToggleTheatre={onToggleTheatre}
      />
    </div>
  );
}

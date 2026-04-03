"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { onYTReady, useVideoHotkeys } from "../utils";
import { YT_AD_POLL_MS as AD_POLL_MS } from "@/constants/config";
import { usePlayerControls } from "./usePlayerControls";
import EmbedControls from "../controls/EmbedControls";
import VideoPoster from "../controls/VideoPoster";

export default function YouTubePlayer({
  videoRef,
  videoId,
  isPlaying,
  playbackRate,
  onPlay,
  onPause,
  onSeek,
  onSpeed,
  canControl = true,
  onTimeUpdate,
  onAmbiColors,
  ambilightEnabled = true,
  theatreMode = false,
  onToggleTheatre,
  onToggleChat,
  hasEpisodes = false,
  onToggleEpisodes,
}) {
  const containerRef = useRef(null);
  const iframeContainerRef = useRef(null);
  const playerRef = useRef(null);
  const { ctrlVis, setCtrlVis, showCtrl, isFullscreen, setIsFullscreen } = usePlayerControls(3000);
  const [ready, setReady] = useState(false);
  const [localTime, setLocalTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [muted, setMuted] = useState(false);
  const [ccEnabled, setCcEnabled] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const pendingSeekRef = useRef(null);
  const ccEnabledRef = useRef(ccEnabled);
  const isBufferingRef = useRef(false);
  const adPollRef = useRef(null);
  const isAdPlayingRef = useRef(false);

  // [Note] Ref ensures the onReady callback sees live isPlaying (init captures stale closure)
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    ccEnabledRef.current = ccEnabled;
  }, [ccEnabled]);

  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    : null;

  // [Note] Static Ambilight: cross-origin blocks canvas reads; sample thumbnail once for themed glow
  useEffect(() => {
    if (!onAmbiColors || !thumbnailUrl || !ambilightEnabled) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = thumbnailUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        onAmbiColors({ r, g, b });
      } catch {
        onAmbiColors(null);
      }
    };
    img.onerror = () => onAmbiColors(null);
    return () => onAmbiColors(null);
  }, [thumbnailUrl, onAmbiColors]);

  // [Note] Ad Skipper: If getVideoData mismatch → seekTo(9999) to force completion
  const startAdWatch = useCallback(() => {
    if (adPollRef.current) return;
    adPollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const data = p.getVideoData?.();
        const state = p.getPlayerState?.();
        const isAd = data && data.video_id && data.video_id !== videoId;
        if (isAd && state === window.YT?.PlayerState?.PLAYING) {
          setIsAdPlaying(true);
          isAdPlayingRef.current = true;
          try {
            p.mute();
            p.seekTo(9999, true);
          } catch {}
        } else {
          if (isAdPlayingRef.current) {
            setIsAdPlaying(false);
            isAdPlayingRef.current = false;
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
  }, [videoId]);

  const stopAdWatch = useCallback(() => {
    clearInterval(adPollRef.current);
    adPollRef.current = null;
  }, []);

  useEffect(() => {
    if (!ready || !playerRef.current) return;
    try {
      playerRef.current.setVolume(volume * 100);
      if (muted) playerRef.current.mute();
      else playerRef.current.unMute();
    } catch {}
  }, [volume, muted, ready]);

  useEffect(() => {
    if (!ready || !playerRef.current) return;
    try {
      playerRef.current.setPlaybackRate?.(playbackRate);
    } catch {}
  }, [playbackRate, ready]);

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
      get duration() {
        try {
          return playerRef.current?.getDuration?.() ?? 0;
        } catch {
          return 0;
        }
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

  useEffect(() => {
    const t = setInterval(() => {
      if (!playerRef.current) return;
      try {
        const time = playerRef.current.getCurrentTime?.() ?? 0;
        const dur = playerRef.current.getDuration?.() ?? 0;
        setLocalTime(time);
        onTimeUpdate?.({ current: time, duration: dur });
        setDuration(dur);
        setBufferedPct(
          (playerRef.current.getVideoLoadedFraction?.() ?? 0) * 100,
        );
      } catch {}
    }, 250);
    return () => clearInterval(t);
  }, []);

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
          autoplay: 1,
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
            if (isPlayingRef.current) {
              try {
                playerRef.current?.playVideo?.();
              } catch {}
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
  }, [videoId]);

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
    onToggleChat,
  });

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-void overflow-hidden group/yt"
      onMouseMove={showCtrl}
      onTouchStart={showCtrl}
    >
      <div
        ref={iframeContainerRef}
        className="w-full h-full [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full"
      />

      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={handlePlayPause}
        onDoubleClick={handleFullscreen}
      />

      <VideoPoster
        visible={!ready}
        thumbnailUrl={thumbnailUrl}
        subtitle="Loading YouTube…"
      />

      {isAdPlaying && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-[var(--radius-pill)] bg-void/70 backdrop-blur-md border border-amber/30 text-amber text-[11px] font-bold uppercase tracking-widest pointer-events-none animate-pulse">
          <span className="w-2 h-2 rounded-full bg-amber animate-ping" />
          Skipping ad…
        </div>
      )}

      <div className="absolute top-3 left-3 px-2 py-1 rounded-[var(--radius-pill)] bg-danger/80 text-[10px] font-bold text-white backdrop-blur-sm z-20 pointer-events-none opacity-0 group-hover/yt:opacity-100 transition-opacity">
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
        hasEpisodes={hasEpisodes}
        onToggleEpisodes={onToggleEpisodes}
      />
    </div>
  );
}

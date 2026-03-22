"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { onVMReady, useVideoHotkeys } from "./utils";
import EmbedControls from "./EmbedControls";
import ThumbnailPoster from "./ThumbnailPoster";

export default function VimeoPlayer({
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
  onAmbiColors,
  theatreMode = false,
  onToggleTheatre,
}) {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
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
  const [thumbnailUrl, setThumbnailUrl] = useState(null);

  // Fetch Vimeo thumbnail via our server-side proxy (avoids CORS).
  useEffect(() => {
    if (!videoId) return;
    setThumbnailUrl(null);
    const vimeoUrl = `https://vimeo.com/${videoId}`;
    fetch(`/api/subtitles/thumbnail?url=${encodeURIComponent(vimeoUrl)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.thumbnailUrl) setThumbnailUrl(d.thumbnailUrl);
      })
      .catch(() => {});
  }, [videoId]);

  // Ambilight: Vimeo is cross-origin.
  // We sample the thumbnail once to provide a static themed room glow.
  useEffect(() => {
    if (!onAmbiColors || !thumbnailUrl) return;
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
  const hideTimer = useRef(null);

  // Buffering state for the Vimeo proxy — read by SyncEngine's sync loop to
  // suppress rate corrections while the player is stalled (Bug #4 fix).
  const isBufferingRef = useRef(false);

  const showCtrl = useCallback(() => {
    setCtrlVis(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setCtrlVis(false), 3000);
  }, []);

  useEffect(() => {
    if (!ready || !playerRef.current) return;
    playerRef.current.setVolume(muted ? 0 : volume).catch(() => {});
  }, [volume, muted, ready]);

  useEffect(() => {
    if (!videoRef) return;
    let _t = 0,
      _p = true,
      _r = 1,
      _ended = false;
    videoRef.current = {
      get currentTime() {
        return _t;
      },
      set currentTime(t) {
        _t = t;
        _ended = false;
        playerRef.current?.setCurrentTime(t).catch(() => {});
      },
      get paused() {
        return _p;
      },
      get ended() {
        return _ended;
      },
      get readyState() {
        return ready ? 4 : 0;
      },
      get playbackRate() {
        return _r;
      },
      set playbackRate(r) {
        _r = r;
        if (ready) playerRef.current?.setPlaybackRate(r).catch(() => {});
      },
      // Buffering state — read by SyncEngine's sync loop to suppress rate
      // corrections while the Vimeo player is stalled (Bug #4 fix).
      get isBuffering() {
        return isBufferingRef.current;
      },
      play() {
        _p = false;
        _ended = false;
        return playerRef.current?.play().catch(() => {}) ?? Promise.resolve();
      },
      pause() {
        _p = true;
        playerRef.current?.pause().catch(() => {});
      },
    };
  }, [videoRef, ready]);

  useEffect(() => {
    if (!videoId) return;
    onVMReady(() => {
      if (!iframeRef.current) return;
      const player = new window.Vimeo.Player(iframeRef.current, {
        id: videoId,
        controls: false,
        responsive: true,
        dnt: true,
      });
      playerRef.current = player;
      player
        .ready()
        .then(() => {
          player.getDuration().then((d) => setDuration(d));
          player.on("timeupdate", ({ seconds }) => setLocalTime(seconds));
          player.on("progress", ({ percent }) => setBufferedPct(percent * 100));
          // Track buffering state so SyncEngine can suppress rate corrections
          // while the Vimeo player is stalled (Bug #4 fix).
          player.on("bufferstart", () => {
            isBufferingRef.current = true;
          });
          player.on("bufferend", () => {
            isBufferingRef.current = false;
          });
          player.on("playing", () => {
            isBufferingRef.current = false;
          });
          player.on("ended", () => {
            // Notify the server to stop advancing time
            player
              .getDuration()
              .then((d) => onPause?.(d))
              .catch(() => {});
          });
          setReady(true);
        })
        .catch(() => {});
    });
    return () => {
      playerRef.current?.destroy?.().catch(() => {});
      playerRef.current = null;
      setReady(false);
    };
  }, [videoId]);

  useEffect(() => {
    if (!ready || !playerRef.current) return;
    if (ccEnabled) {
      // Best effort toggle using Vimeo API
      playerRef.current.enableTextTrack("en").catch(() => {});
    } else {
      playerRef.current.disableTextTrack().catch(() => {});
    }
  }, [ccEnabled, ready]);

  function handlePlayPause() {
    if (!ready || !canControl) return;
    if (isPlaying) {
      onPause?.(localTime);
    } else {
      // If video ended, restart from 0 for all viewers
      if (localTime >= duration - 0.5) {
        playerRef.current?.setCurrentTime(0).catch(() => {});
        onPlay?.(0);
      } else {
        onPlay?.(localTime);
      }
    }
  }

  function handleSeekCommit(e) {
    if (!ready) return;
    const t = Number(e.target.value);
    playerRef.current?.setCurrentTime(t).catch(() => {});
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

  useEffect(() => {
    const onFS = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFS);
    return () => document.removeEventListener("fullscreenchange", onFS);
  }, []);

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
      className="relative w-full h-full bg-black overflow-hidden group/vm"
      onMouseMove={showCtrl}
      onTouchStart={showCtrl}
    >
      <iframe
        ref={iframeRef}
        src={`https://player.vimeo.com/video/${videoId}?controls=0&dnt=1`}
        className="w-full h-full"
        allow="autoplay; fullscreen"
        allowFullScreen
      />
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={handlePlayPause}
        onDoubleClick={handleFullscreen}
      />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-black pointer-events-none">
          <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
        </div>
      )}
      <ThumbnailPoster
        visible={!ready}
        thumbnailUrl={thumbnailUrl}
        subtitle="Loading Vimeo…"
      />
      <div className="absolute top-3 left-3 px-2 py-1 rounded-[2rem] bg-[#1ab7ea]/80 text-[10px] font-bold text-white backdrop-blur-sm z-20 pointer-events-none opacity-0 group-hover/vm:opacity-100 transition-opacity">
        Vimeo
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
        showSpeed={canControl}
        onSpeedChange={onSpeed}
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

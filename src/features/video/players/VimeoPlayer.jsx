"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { onVMReady } from "../utils";
import { usePlayerControls } from "../hooks/usePlayerControls";
import { useVideoHotkeys } from "../hooks/useVideoHotkeys";
import EmbedControls from "../controls/EmbedControls";
import VideoPoster from "../controls/VideoPoster";

export default function VimeoPlayer({
  videoRef,
  videoId,
  isPlaying,
  playbackRate,
  onPlay,
  onPause,
  onSeek,
  onSpeed,
  canControl = true,
  onAmbiColors,
  ambilightEnabled = true,
  theatreMode = false,
  onToggleTheatre,
  hasEpisodes = false,
  onToggleEpisodes,
  onEnded,
  isHost = true,
}) {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const playerRef = useRef(null);
  const { ctrlVis, showCtrl, isFullscreen } = usePlayerControls(3000);
  const [ready, setReady] = useState(false);
  const [localTime, setLocalTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [muted, setMuted] = useState(false);
  const [ccEnabled, setCcEnabled] = useState(false);
  const [volume, setVolume] = useState(1);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);

  useEffect(() => {
    if (!videoId) return;
    setThumbnailUrl(null);
    const vimeoUrl = `https://vimeo.com/${videoId}`;
    fetch(`/api/video/thumbnail?url=${encodeURIComponent(vimeoUrl)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.thumbnailUrl) {
          setThumbnailUrl(json.data.thumbnailUrl);
        }
      })
      .catch(() => {});
  }, [videoId]);

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
  }, [thumbnailUrl, onAmbiColors, ambilightEnabled]);

  // read by SyncEngine to suppress rate corrections while stalled
  const isBufferingRef = useRef(false);

  useEffect(() => {
    if (!ready || !playerRef.current) return;
    playerRef.current.setVolume(muted ? 0 : volume).catch(() => {});
  }, [volume, muted, ready]);

  const _t = useRef(0);
  const _p = useRef(true);
  const _r = useRef(1);
  const _dur = useRef(0);
  const _ended = useRef(false);

  useEffect(() => {
    if (!videoRef) return;
    videoRef.current = {
      get currentTime() {
        return _t.current;
      },
      set currentTime(t) {
        _t.current = t;
        _ended.current = false;
        playerRef.current?.setCurrentTime(t).catch(() => {});
      },
      get duration() {
        return _dur.current;
      },
      get paused() {
        return _p.current;
      },
      get ended() {
        return _ended.current;
      },
      get readyState() {
        return ready ? 4 : 0;
      },
      get playbackRate() {
        return _r.current;
      },
      set playbackRate(r) {
        _r.current = r;
        if (ready) playerRef.current?.setPlaybackRate(r).catch(() => {});
      },
      get isBuffering() {
        return isBufferingRef.current;
      },
      play() {
        _p.current = false;
        _ended.current = false;
        return playerRef.current?.play().catch(() => {}) ?? Promise.resolve();
      },
      pause() {
        _p.current = true;
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
        autoplay: true,
      });
      playerRef.current = player;
      player
        .ready()
        .then(() => {
          player.getDuration().then((d) => {
            setDuration(d);
            _dur.current = d;
          });
          player.on("timeupdate", ({ seconds }) => {
            _t.current = seconds;
            setLocalTime(seconds);
          });
          player.on("progress", ({ percent }) => setBufferedPct(percent * 100));
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
            _ended.current = true;
            onEnded?.();
            player
              .getDuration()
              .then((d) => {
                onPause?.(d);
              })
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
  }, [videoId, onEnded, onPause]);

  useEffect(() => {
    if (!ready || !playerRef.current) return;
    if (ccEnabled) {
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
      className="relative w-full h-full bg-void overflow-hidden group/vm"
      onMouseMove={showCtrl}
      onTouchStart={showCtrl}
    >
      <iframe
        ref={iframeRef}
        src={`https://player.vimeo.com/video/${videoId}?controls=0&dnt=1&autoplay=1`}
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
        <div className="absolute inset-0 flex items-center justify-center bg-void pointer-events-none">
          <div className="w-10 h-10 rounded-full border-2 border-amber/20 border-t-amber animate-spin" />
        </div>
      )}
      <VideoPoster
        visible={!ready}
        thumbnailUrl={thumbnailUrl}
        subtitle="Loading Vimeo…"
      />
      <div className="absolute top-3 left-3 px-2 py-1 rounded-[var(--radius-pill)] bg-[#1ab7ea]/80 text-[10px] font-bold text-white backdrop-blur-sm z-20 pointer-events-none opacity-0 group-hover/vm:opacity-100 transition-opacity">
        Vimeo
      </div>
      <EmbedControls
        isHost={isHost}
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
        hasEpisodes={hasEpisodes}
        onToggleEpisodes={onToggleEpisodes}
      />
    </div>
  );
}

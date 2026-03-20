"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { onYTReady, useVideoHotkeys } from "./utils";
import EmbedControls from "./EmbedControls";

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
  const [volume, setVolume] = useState(1);
  const hideTimer = useRef(null);

  const showCtrl = useCallback(() => {
    setCtrlVis(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setCtrlVis(false), 3000);
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
          playerRef.current?.seekTo?.(t, true);
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
        setLocalTime(playerRef.current.getCurrentTime?.() ?? 0);
        setDuration(playerRef.current.getDuration?.() ?? 0);
        setBufferedPct((playerRef.current.getVideoLoadedFraction?.() ?? 0) * 100);
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
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
        },
        events: { onReady: () => setReady(true) },
      });
    });
    return () => {
      try {
        playerRef.current?.destroy?.();
      } catch {}
      playerRef.current = null;
      div.remove();
      setReady(false);
    };
  }, [videoId]);

  function handlePlayPause() {
    if (!ready || !canControl) return;
    const t = playerRef.current?.getCurrentTime?.() ?? 0;
    if (isPlaying) onPause?.(t);
    else onPlay?.(t);
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
        canControl={canControl}
      />
    </div>
  );
}

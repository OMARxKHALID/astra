"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { onVMReady, useVideoHotkeys } from "./utils";
import EmbedControls from "./EmbedControls";

export default function VimeoPlayer({
  videoRef,
  videoId,
  isHost,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
  canControl = true,
}) {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [localTime, setLocalTime] = useState(0);
  const [duration, setDuration] = useState(0);
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
    playerRef.current.setVolume(muted ? 0 : volume).catch(() => {});
  }, [volume, muted, ready]);

  useEffect(() => {
    if (!videoRef) return;
    let _t = 0,
      _p = true;
    videoRef.current = {
      get currentTime() {
        return _t;
      },
      set currentTime(t) {
        _t = t;
        playerRef.current?.setCurrentTime(t).catch(() => {});
      },
      get paused() {
        return _p;
      },
      get readyState() {
        return ready ? 4 : 0;
      },
      get playbackRate() {
        return 1;
      },
      set playbackRate(_) {},
      play() {
        _p = false;
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

  function handlePlayPause() {
    if (!ready || !canControl) return;
    if (isPlaying) onPause?.(localTime);
    else onPlay?.(localTime);
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
      className="relative w-full h-full bg-black"
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
      <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-[#1ab7ea]/80 text-[10px] font-bold text-white backdrop-blur-sm z-20">
        Vimeo
      </div>
      <EmbedControls
        visible={ctrlVis}
        isPlaying={isPlaying}
        localTime={localTime}
        duration={duration}
        progressPct={duration > 0 ? (localTime / duration) * 100 : 0}
        playbackRate={1}
        onPlayPause={handlePlayPause}
        onSeekCommit={handleSeekCommit}
        showSpeed={false}
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

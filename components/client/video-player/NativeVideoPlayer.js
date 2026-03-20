"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  formatTime,
  SpeedPicker,
  useVideoHotkeys,
  PlayIcon,
  PauseIcon,
  VolumeIcon,
  MuteIcon,
  ExpandIcon,
  CompressIcon,
  ExclamationIcon,
  LockSmallIcon,
} from "./utils";

export default function NativeVideoPlayer({
  videoRef,
  videoUrl,
  sourceType,
  isPlaying,
  playbackRate,
  onPlay,
  onPause,
  onSeek,
  onSpeed,
  canControl = true,
  chatOverlay,
}) {
  const [localTime, setLocalTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [ctrlVis, setCtrlVis] = useState(true);
  const [videoError, setVideoError] = useState(false);

  const containerRef = useRef(null);
  const hideTimer = useRef(null);
  const seekingRef = useRef(false);

  const showCtrl = useCallback(() => {
    setCtrlVis(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setCtrlVis(false), 3000);
  }, []);

  useEffect(() => {
    showCtrl();
    return () => clearTimeout(hideTimer.current);
  }, [showCtrl]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || sourceType !== "hls") return;
    let hls;
    (async () => {
      const Hls = (await import("hls.js")).default;
      if (!Hls.isSupported()) {
        v.src = videoUrl;
        return;
      }
      hls = new Hls();
      hls.loadSource(videoUrl);
      hls.attachMedia(v);
      hls.on(Hls.Events.ERROR, (_, d) => {
        if (d.fatal) setVideoError(true);
      });
    })();
    return () => hls?.destroy();
  }, [videoUrl, sourceType, videoRef]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (sourceType === "mp4") v.src = videoUrl;
    const onTime = () => {
      if (!seekingRef.current) setLocalTime(v.currentTime);
    };
    const onMeta = () => {
      setDuration(v.duration);
      setVideoError(false);
    };
    const onWait = () => setBuffering(true);
    const onCan = () => setBuffering(false);
    const onErr = () => setVideoError(true);
    const onProg = () => {
      if (v.buffered && v.buffered.length > 0) {
        const end = v.buffered.end(v.buffered.length - 1);
        setBufferedPct(v.duration > 0 ? (end / v.duration) * 100 : 0);
      }
    };
    const onFS = () => setFullscreen(Boolean(document.fullscreenElement));
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("waiting", onWait);
    v.addEventListener("canplay", onCan);
    v.addEventListener("canplaythrough", onCan);
    v.addEventListener("error", onErr);
    v.addEventListener("progress", onProg);
    document.addEventListener("fullscreenchange", onFS);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("waiting", onWait);
      v.removeEventListener("canplay", onCan);
      v.removeEventListener("canplaythrough", onCan);
      v.removeEventListener("error", onErr);
      v.removeEventListener("progress", onProg);
      document.removeEventListener("fullscreenchange", onFS);
    };
  }, [videoRef, videoUrl, sourceType]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted;
  }, [volume, muted, videoRef]);

  function handlePlayPause() {
    if (!canControl) return;
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) onPause?.(v.currentTime);
    else onPlay?.(v.currentTime);
  }

  function handleSeekChange(e) {
    seekingRef.current = true;
    setLocalTime(Number(e.target.value));
  }

  function handleSeekCommit(e) {
    seekingRef.current = false;
    const t = Number(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = t;
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

  function handleSpeedChange(rate) {
    if (!canControl) return;
    onSpeed?.(rate);
  }

  function handleRetry() {
    setVideoError(false);
    videoRef.current?.load();
  }

  useVideoHotkeys({
    videoRef,
    handlePlayPause,
    handleFullscreen,
    onSeek,
    setMuted,
  });

  const progressPct = duration > 0 ? (localTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black select-none"
      onMouseMove={showCtrl}
      onTouchStart={showCtrl}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        preload="metadata"
        onClick={handlePlayPause}
        onDoubleClick={handleFullscreen}
        aria-label="Video player"
        style={{ cursor: ctrlVis ? "pointer" : "none" }}
      />

      {buffering && !videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="w-14 h-14 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
        </div>
      )}

      {videoError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-void/90 backdrop-blur-xl gap-5 text-center">
          <div className="w-14 h-14 rounded-3xl bg-danger/10 flex items-center justify-center border border-danger/20">
            <ExclamationIcon className="w-7 h-7 text-danger" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-text">
              Playback Error
            </h3>
            <p className="text-sm text-muted mt-1">
              Could not load this video source.
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="h-10 px-6 rounded-full bg-surface border border-border hover:border-amber-500/40 text-xs font-bold transition-all active:scale-95"
          >
            Try Again
          </button>
        </div>
      )}

      {chatOverlay}

      <div
        className={`absolute inset-x-0 bottom-0 z-20 transition-all duration-400
        ${ctrlVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
        <div className="relative px-4 pb-4 pt-8 space-y-2">
          <div className="relative h-1.5 bg-white/15 rounded-full hover:h-2 transition-all duration-150 cursor-pointer overflow-hidden group/seek">
            <div
              className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-200"
              style={{ width: `${bufferedPct}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-150"
              style={{ width: `${progressPct}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={localTime}
              onChange={handleSeekChange}
              onMouseUp={handleSeekCommit}
              onTouchEnd={handleSeekCommit}
              aria-label="Seek position"
              className="absolute inset-0 w-full opacity-0 cursor-pointer py-3"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePlayPause}
              aria-label={isPlaying ? "Pause" : "Play"}
              disabled={!canControl}
              className={`w-11 h-11 flex items-center justify-center rounded-[2rem] border border-white/8 transition-all active:scale-90 backdrop-blur-sm
                ${canControl ? "bg-white/8 hover:bg-white/18 text-white" : "bg-white/4 text-white/30 cursor-not-allowed"}`}
            >
              {isPlaying ? (
                <PauseIcon className="w-5 h-5" />
              ) : (
                <PlayIcon className="w-5 h-5 ml-0.5" />
              )}
            </button>
            <div className="flex items-center group/vol">
              <button
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? "Unmute" : "Mute"}
                className="w-9 h-9 flex items-center justify-center rounded-[2rem] text-white/60 hover:text-white transition-colors"
              >
                {muted || volume === 0 ? (
                  <MuteIcon className="w-4 h-4" />
                ) : (
                  <VolumeIcon className="w-4 h-4" />
                )}
              </button>
              <div className="w-0 group-hover/vol:w-20 transition-all duration-300 overflow-hidden flex items-center h-9">
                <div className="relative w-18 h-1.5 ml-2 bg-white/15 rounded-full cursor-pointer overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-white/80 rounded-full pointer-events-none transition-all duration-150"
                    style={{ width: `${(muted ? 0 : volume) * 100}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    aria-label="Volume"
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <span className="text-[11px] font-mono text-white/80 tabular-nums bg-white/5 px-2.5 py-1 rounded-[2rem] border border-white/5">
              {formatTime(localTime)} / {formatTime(duration)}
            </span>

            {!canControl && (
              <span className="text-[9px] font-mono text-amber-400/60 uppercase tracking-wider flex items-center gap-1.5">
                <LockSmallIcon className="w-3 h-3" /> Host only
              </span>
            )}

            <div className="flex-1" />

            {canControl && <SpeedPicker value={playbackRate} onChange={handleSpeedChange} />}

            <button
              onClick={handleFullscreen}
              aria-label="Toggle fullscreen"
              className="w-9 h-9 flex items-center justify-center rounded-[2rem] bg-white/8 hover:bg-white/18 border border-white/8 text-white transition-all active:scale-90 backdrop-blur-sm"
            >
              {fullscreen ? (
                <CompressIcon className="w-4 h-4" />
              ) : (
                <ExpandIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

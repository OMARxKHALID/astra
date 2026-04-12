"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { LS_KEYS } from "@/constants/config";
import { ls } from "@/utils/localStorage";
import { usePlayerControls } from "../hooks/usePlayerControls";
import { useVideoHotkeys } from "../hooks/useVideoHotkeys";

import useHLS from "./native/hooks/useHLS";
import useAmbilight from "./native/hooks/useAmbilight";
import useScrubPreview from "./native/hooks/useScrubPreview";
import useVideoEvents from "./native/hooks/useVideoEvents";
import useSubtitleStyle from "./native/hooks/useSubtitleStyle";
import useAutoSubtitle from "./native/hooks/useAutoSubtitle";

import SubtitlePanel from "./native/components/SubtitlePanel";
import TechnicalStats from "./native/components/TechnicalStats";
import ControlBar from "./native/components/ControlBar";
import VolumeOsd from "./native/components/VolumeOsd";
import ErrorOverlay from "./native/components/ErrorOverlay";
import { memo } from "react";

const MemoControlBar = memo(ControlBar);

export default function NativeVideoPlayer({
  videoRef,
  videoUrl,
  subtitleUrl,
  sourceType,
  isPlaying,
  playbackRate,
  onPlay,
  onPause,
  onSeek,
  onSpeed,
  canControl = true,
  onLoad,
  onSubtitleChange,
  onAmbiColors,
  screenshotEnabled = true,
  hlsQualityEnabled = true,
  scrubPreviewEnabled = true,
  ambilightEnabled = true,
  onCapture,
  addToast,
  theatreMode = false,
  onToggleTheatre,
  hasEpisodes = false,
  onToggleEpisodes,
  onEnded,
  isHost = true,
}) {
  const [localTime, setLocalTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const { ctrlVis, showCtrl } = usePlayerControls(3000);
  const [showStats, setShowStats] = useState(false);
  const [volumeOsd, setVolumeOsd] = useState(null);
  const [videoError, setVideoError] = useState(false);
  const [ccMenuOpen, setCcMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [posterVisible, setPosterVisible] = useState(true);
  const [isPip, setIsPip] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [recentSubs, setRecentSubs] = useState([]);
  const [subStyle, setSubStyle] = useState({
    fontSize: 100,
    color: "#ffffff",
    background: "rgba(0,0,0,0)",
    position: "bottom",
    shadow: "soft",
  });
  const [subtitleOffset, setSubtitleOffset] = useState(0);

  useEffect(() => {
    try {
      setRecentSubs(JSON.parse(ls.get(LS_KEYS.recentSubs) || "[]"));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const saved = ls.get(LS_KEYS.subStyle);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSubStyle({
          fontSize: parsed.fontSize || 100,
          color: parsed.color || "#ffffff",
          background: parsed.background || "rgba(0,0,0,0)",
          position: parsed.position || "bottom",
          shadow: parsed.shadow || "soft",
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      setSubtitleOffset(parseFloat(ls.get(LS_KEYS.subtitleOffset) || "0"));
    } catch {}
  }, []);

  useEffect(() => {
    ls.set(LS_KEYS.subStyle, JSON.stringify(subStyle));
  }, [subStyle]);

  useEffect(() => {
    ls.set(LS_KEYS.subtitleOffset, String(subtitleOffset));
  }, [subtitleOffset]);

  const containerRef = useRef(null);
  const volumeOsdTimer = useRef(null);
  const seekingRef = useRef(false);

  // [Note] Mobile Logic: Track tap timestamps for sophisticated double-tap detection
  const lastTapRef = useRef(0);

  const { hlsQuality, hlsRef } = useHLS(
    videoRef,
    videoUrl,
    sourceType,
    setVideoError,
  );
  useAmbilight(videoRef, videoUrl, onAmbiColors, ambilightEnabled);
  useSubtitleStyle(
    videoRef,
    subtitleUrl,
    showSubtitles,
    subtitleOffset,
    subStyle,
  );

  useAutoSubtitle({
    videoUrl,
    subtitleUrl,
    onSubtitleChange,
    setShowSubtitles,
  });
  const { preview, handleMouseMove, handleMouseLeave } = useScrubPreview(
    videoUrl,
    sourceType,
    duration,
    scrubPreviewEnabled,
  );

  useVideoEvents({
    videoRef,
    videoUrl,
    sourceType,
    setDuration,
    setLocalTime,
    setBufferedPct,
    setBuffering,
    setVideoError,
    setPosterVisible,
    setFullscreen,
    onPause,
    onPlay,
    onEnded,
    seekingRef,
    playbackRate,
    addToast,
  });

  useEffect(() => {
    setPipSupported(
      typeof document !== "undefined" && !!document.pictureInPictureEnabled,
    );
  }, []);

  useEffect(() => {
    showCtrl();
  }, [showCtrl]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const enter = () => setIsPip(true);
    const leave = () => setIsPip(false);
    v.addEventListener("enterpictureinpicture", enter);
    v.addEventListener("leavepictureinpicture", leave);
    return () => {
      v.removeEventListener("enterpictureinpicture", enter);
      v.removeEventListener("leavepictureinpicture", leave);
    };
  }, [videoRef]);

  const handlePlayPause = useCallback(() => {
    if (!canControl) return;
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause();
      onPause?.(v.currentTime);
    } else {
      if (v.ended) v.currentTime = 0;
      v.play().catch(() => {});
      onPlay?.(v.currentTime);
    }
  }, [isPlaying, canControl, onPause, onPlay, videoRef]);

  const handleSeekChange = (e) => {
    if (!canControl) return;
    seekingRef.current = true;
    setLocalTime(Number(e.target.value));
  };

  const handleSeekCommit = (e) => {
    if (!canControl) return;
    seekingRef.current = false;
    const t = Number(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = t;
    onSeek?.(t);
  };

  const handleVolumeOsd = (v) => {
    setVolumeOsd(v);
    clearTimeout(volumeOsdTimer.current);
    volumeOsdTimer.current = setTimeout(() => setVolumeOsd(null), 1500);
  };

  const handleVolumeChange = (e) => {
    const v = Number(e.target.value);
    setVolume(v);
    setMuted(v === 0);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const next = Math.max(0, Math.min(1, volume + delta));
    setVolume(next);
    setMuted(next === 0);
    handleVolumeOsd(next);
    showCtrl();
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  const executeDoubleTapAction = useCallback(
    (clientX, rect) => {
      if (!canControl || !videoRef.current) {
        if (!document.fullscreenElement)
          containerRef.current?.requestFullscreen();
        else document.exitFullscreen();
        return;
      }
      const x = clientX - rect.left;
      const width = rect.width;
      if (x < width * 0.3) {
        const t = Math.max(0, videoRef.current.currentTime - 10);
        videoRef.current.currentTime = t;
        onSeek?.(t);
        handleVolumeOsd("rewind");
      } else if (x > width * 0.7) {
        const t = Math.min(duration, videoRef.current.currentTime + 10);
        videoRef.current.currentTime = t;
        onSeek?.(t);
        handleVolumeOsd("forward");
      } else {
        if (!document.fullscreenElement)
          containerRef.current?.requestFullscreen();
        else document.exitFullscreen();
      }
    },
    [canControl, videoRef, duration, onSeek],
  );

  const handleDoubleClick = useCallback(
    (e) => {
      executeDoubleTapAction(
        e.clientX,
        e.currentTarget.getBoundingClientRect(),
      );
    },
    [executeDoubleTapAction],
  );

  // [Note] Sophisticated Touch Handler: Eliminates the 250ms delay by using location-aware logic.
  // Sides (30% L/R): Single-tap shows UI, Double-tap seeks. No playback interruption.
  // Center (40%): Single-tap toggles Play/Pause IMMEDIATELY. Double-tap toggles Fullscreen.
  const handleTouchEnd = useCallback(
    (e) => {
      if (e.cancelable) e.preventDefault();
      showCtrl();

      const now = Date.now();
      const since = now - lastTapRef.current;
      lastTapRef.current = now;

      const touch = e.changedTouches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const xPct = (touch.clientX - rect.left) / rect.width;
      const isSide = xPct < 0.3 || xPct > 0.7;

      if (since < 300 && since > 0) {
        lastTapRef.current = 0;

        if (isSide) {
          executeDoubleTapAction(touch.clientX, rect);
        } else {
          handlePlayPause();
          executeDoubleTapAction(touch.clientX, rect);
        }
      } else {
        if (!isSide) {
          handlePlayPause();
        }
      }
    },
    [showCtrl, executeDoubleTapAction, handlePlayPause],
  );

  const handleScreenshot = () => {
    const v = videoRef.current;
    if (!v || !onCapture) return;
    try {
      const w = v.videoWidth || 1280,
        h = v.videoHeight || 720;
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(w, 1920);
      canvas.height = Math.round(h * (canvas.width / w));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      onCapture(canvas.toDataURL("image/jpeg", 0.75));
    } catch {}
  };

  const handlePip = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement === v)
        await document.exitPictureInPicture();
      else if (document.pictureInPictureEnabled && v.readyState >= 1) {
        if (document.pictureInPictureElement)
          await document.exitPictureInPicture();
        await v.requestPictureInPicture();
      }
    } catch (err) {
      // [Note] PiP Fail: Likely due to lack of user gesture or device support
    }
  };

  // [Note] Mobile automation: PiP on tab switch
  useEffect(() => {
    const h = () => {
      const v = videoRef.current;
      if (
        !v ||
        document.visibilityState !== "hidden" ||
        v.paused ||
        window.innerWidth >= 1024
      )
        return;
      if (document.pictureInPictureEnabled && !document.pictureInPictureElement)
        v.requestPictureInPicture().catch(() => {});
    };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [videoRef]);

  useEffect(() => {
    const h = (e) => {
      if (
        !["INPUT", "TEXTAREA"].includes(e.target.tagName) &&
        e.key.toLowerCase() === "d"
      ) {
        setShowStats((s) => !s);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
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
      className="relative w-full h-full bg-void select-none overflow-hidden"
      onMouseMove={showCtrl}
      onTouchStart={showCtrl}
      onWheel={handleWheel}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain"
        playsInline
        autoPlay
        preload="metadata"
        crossOrigin="anonymous"
        onClick={handlePlayPause}
        onDoubleClick={handleDoubleClick}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: ctrlVis ? "pointer" : "none" }}
      >
        {subtitleUrl && showSubtitles && (
          <track
            key={subtitleUrl}
            kind="subtitles"
            src={subtitleUrl}
            srcLang="en"
            label="English"
            default
          />
        )}
      </video>

      {buffering && !videoError && !posterVisible && (
        <div className="absolute inset-0 flex items-center justify-center bg-void/30 pointer-events-none z-30 transition-opacity">
          <div className="w-14 h-14 rounded-[var(--radius-pill)] border-2 border-amber/20 border-t-amber animate-spin shadow-[0_0_30px_rgba(245,158,11,0.2)]" />
        </div>
      )}

      {posterVisible && !videoError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 transition-all duration-700 bg-void">
          <div className="absolute inset-0 opacity-20 filter blur-[80px] pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[40%] bg-amber rounded-full animate-pulse-slow" />
          </div>
          <div className="relative flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-1000">
            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-2xl">
              <div className="w-8 h-8 rounded-full border-2 border-amber/30 border-t-amber animate-spin" />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-mono font-black text-amber uppercase tracking-[0.3em]">
                Astra Sync
              </span>
              <span className="text-[11px] font-mono text-white/30 uppercase tracking-widest">
                Waiting for source...
              </span>
            </div>
          </div>
        </div>
      )}

      <SubtitlePanel
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        subtitleUrl={subtitleUrl}
        onSubtitleChange={onSubtitleChange}
        setShowSubtitles={setShowSubtitles}
        onLoad={onLoad}
        videoUrl={videoUrl}
        recentSubs={recentSubs}
        setRecentSubs={setRecentSubs}
        subStyle={subStyle}
        setSubStyle={setSubStyle}
        addToast={addToast}
        subtitleOffset={subtitleOffset}
        setSubtitleOffset={setSubtitleOffset}
      />

      <TechnicalStats
        visible={showStats}
        hlsQuality={hlsQuality}
        videoUrl={videoUrl}
        sourceType={sourceType}
        duration={duration}
        localTime={localTime}
        videoRef={videoRef}
      />

      <VolumeOsd value={volumeOsd} />

      <ErrorOverlay
        error={videoError}
        onRetry={() => {
          setVideoError(false);
          videoRef.current?.load();
        }}
        onDismiss={() => setVideoError(false)}
      />

      <MemoControlBar
        isHost={isHost}
        isPlaying={isPlaying}
        localTime={localTime}
        duration={duration}
        bufferedPct={bufferedPct}
        onPlayPause={handlePlayPause}
        onSeekChange={handleSeekChange}
        onSeekCommit={handleSeekCommit}
        volume={volume}
        muted={muted}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={() => setMuted((m) => !m)}
        fullscreen={fullscreen}
        onFullscreenToggle={handleFullscreen}
        canControl={canControl}
        playbackRate={playbackRate}
        onSpeedChange={(rate) => canControl && onSpeed?.(rate)}
        hlsQuality={hlsQuality}
        hlsRef={hlsRef}
        sourceType={sourceType}
        hlsQualityEnabled={hlsQualityEnabled}
        pipSupported={pipSupported}
        isPip={isPip}
        onPipToggle={handlePip}
        screenshotEnabled={screenshotEnabled}
        onCapture={handleScreenshot}
        theatreMode={theatreMode}
        onToggleTheatre={onToggleTheatre}
        ccMenuOpen={ccMenuOpen}
        setCcMenuOpen={setCcMenuOpen}
        showSubtitles={showSubtitles}
        setShowSubtitles={setShowSubtitles}
        subtitleUrl={subtitleUrl}
        setActivePanel={setActivePanel}
        activePanel={activePanel}
        preview={preview}
        handleMouseMove={handleMouseMove}
        handleMouseLeave={handleMouseLeave}
        ctrlVis={ctrlVis}
        hasEpisodes={hasEpisodes}
        onToggleEpisodes={onToggleEpisodes}
      />
    </div>
  );
}

"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useVideoHotkeys } from "../utils";
import { LS_KEYS } from "@/constants/config";
import { ls } from "@/utils/localStorage";

import useHLS from "./native/hooks/useHLS";
import useAmbilight from "./native/hooks/useAmbilight";
import useScrubPreview from "./native/hooks/useScrubPreview";
import useVideoEvents from "./native/hooks/useVideoEvents";
import useSubtitleStyle from "./native/hooks/useSubtitleStyle";

import SubtitlePanel from "./native/components/SubtitlePanel";
import TechnicalStats from "./native/components/TechnicalStats";
import ControlBar from "./native/components/ControlBar";
import VolumeOsd from "./native/components/VolumeOsd";
import ErrorOverlay from "./native/components/ErrorOverlay";

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
  onSendScreenshot,
  addToast,
  theatreMode = false,
  onToggleTheatre,
  onToggleChat,
}) {
  const [localTime, setLocalTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [ctrlVis, setCtrlVis] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [volumeOsd, setVolumeOsd] = useState(null);
  const [videoError, setVideoError] = useState(false);
  const [ccMenuOpen, setCcMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [posterVisible, setPosterVisible] = useState(true);
  const [isPip, setIsPip] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [recentSubs, setRecentSubs] = useState(() => {
    try {
      return JSON.parse(ls.get(LS_KEYS.recentSubs) || "[]");
    } catch {
      return [];
    }
  });
  const [subStyle, setSubStyle] = useState({
    fontSize: 100,
    color: "#ffffff",
    background: "rgba(0,0,0,0)",
    position: "bottom",
    shadow: "soft",
  });
  const [subtitleOffset, setSubtitleOffset] = useState(0);

  const containerRef = useRef(null);
  const hideTimer = useRef(null);
  const volumeOsdTimer = useRef(null);
  const seekingRef = useRef(false);

  // [Note] Specialized Hooks: Modular logic for player features
  const { hlsQuality } = useHLS(videoRef, videoUrl, sourceType, setVideoError);
  useAmbilight(videoRef, videoUrl, onAmbiColors, ambilightEnabled);
  useSubtitleStyle(videoRef, subtitleUrl, showSubtitles, subtitleOffset, subStyle);
  const { preview, handleMouseMove, handleMouseLeave } = useScrubPreview(
    videoUrl,
    sourceType,
    duration,
    scrubPreviewEnabled
  );
  
  useVideoEvents({
    videoRef, videoUrl, sourceType, setDuration, setLocalTime, 
    setBufferedPct, setBuffering, setVideoError, setPosterVisible, 
    setFullscreen, onPause, onPlay, seekingRef, playbackRate
  });

  useEffect(() => {
    setPipSupported(typeof document !== "undefined" && !!document.pictureInPictureEnabled);
  }, []);

  // [Note] Idle timer: hide controls after 3s mouse inactivity
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

  const handleScreenshot = () => {
    const v = videoRef.current;
    if (!v || !onSendScreenshot) return;
    try {
      const w = v.videoWidth || 1280, h = v.videoHeight || 720;
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(w, 1920);
      canvas.height = Math.round(h * (canvas.width / w));
      canvas.getContext("2d").drawImage(v, 0, 0, canvas.width, canvas.height);
      onSendScreenshot(canvas.toDataURL("image/jpeg", 0.75));
      addToast?.("Screenshot sent to chat!", "success");
    } catch {
      addToast?.("Screenshot blocked: Cross-origin security.", "error");
    }
  };

  const handlePip = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement === v) await document.exitPictureInPicture();
      else if (document.pictureInPictureEnabled && v.readyState >= 1) {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        await v.requestPictureInPicture();
      }
    } catch (err) {
      console.warn("[PiP]", err.message);
    }
  };

  // [Note] Mobile automation: PiP on tab switch
  useEffect(() => {
    const h = () => {
      const v = videoRef.current;
      if (!v || document.visibilityState !== "hidden" || v.paused || window.innerWidth >= 1024) return;
      if (document.pictureInPictureEnabled && !document.pictureInPictureElement) v.requestPictureInPicture().catch(() => {});
    };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [videoRef]);

  // [Note] Debug Stats: triggered by 'D' hotkey
  useEffect(() => {
    const h = (e) => {
      if (!["INPUT", "TEXTAREA"].includes(e.target.tagName) && e.key.toLowerCase() === "d") {
        setShowStats(s => !s);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useVideoHotkeys({
    videoRef, handlePlayPause, handleFullscreen, 
    onSeek, setMuted, onToggleChat
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
        onDoubleClick={handleFullscreen}
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

      {buffering && !videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-void/30 pointer-events-none z-30 transition-opacity">
          <div className="w-14 h-14 rounded-[var(--radius-pill)] border-2 border-amber/20 border-t-amber animate-spin shadow-[0_0_30px_rgba(var(--color-amber-rgb), 0.2)]" />
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
        onRetry={() => { setVideoError(false); videoRef.current?.load(); }}
        onDismiss={() => setVideoError(false)}
      />

      <ControlBar 
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
        onMuteToggle={() => setMuted(m => !m)}
        fullscreen={fullscreen}
        onFullscreenToggle={handleFullscreen}
        canControl={canControl}
        playbackRate={playbackRate}
        onSpeedChange={rate => canControl && onSpeed?.(rate)}
        hlsQuality={hlsQuality}
        sourceType={sourceType}
        hlsQualityEnabled={hlsQualityEnabled}
        pipSupported={pipSupported}
        isPip={isPip}
        onPipToggle={handlePip}
        screenshotEnabled={screenshotEnabled}
        onScreenshot={handleScreenshot}
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
      />
    </div>
  );
}

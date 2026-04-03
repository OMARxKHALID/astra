"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useVideoHotkeys } from "../utils";
import { LS_KEYS } from "@/constants/config";
import { ls } from "@/utils/localStorage";
import { usePlayerControls } from "./usePlayerControls";

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
  unreadCount = 0,
  hasEpisodes = false,
  onToggleEpisodes,
}) {
  const [localTime, setLocalTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const { ctrlVis, setCtrlVis, showCtrl } = usePlayerControls(3000);
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
  const volumeOsdTimer = useRef(null);
  const seekingRef = useRef(false);
  // [Note] lastTapRef + singleTapTimer: manual double-tap detector for mobile.
  // onDoubleClick doesn't fire reliably on iOS/Android Chrome so we track two
  // taps within 300ms via onTouchEnd timestamps instead.
  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef(null);

  const { hlsQuality } = useHLS(videoRef, videoUrl, sourceType, setVideoError);
  useAmbilight(videoRef, videoUrl, onAmbiColors, ambilightEnabled);
  useSubtitleStyle(
    videoRef,
    subtitleUrl,
    showSubtitles,
    subtitleOffset,
    subStyle,
  );
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

  // [Note] Mobile double-tap: onDoubleClick is unreliable on iOS/Android Chrome.
  // We detect two taps within 300ms via onTouchEnd timestamps. Single-tap play/pause
  // is deferred 250ms so it can be cancelled when a double-tap arrives.
  const handleTouchEnd = useCallback(
    (e) => {
      showCtrl();
      const now = Date.now();
      const since = now - lastTapRef.current;
      if (since < 300 && since > 0) {
        clearTimeout(singleTapTimerRef.current);
        lastTapRef.current = 0;
        const touch = e.changedTouches[0];
        executeDoubleTapAction(
          touch.clientX,
          e.currentTarget.getBoundingClientRect(),
        );
      } else {
        lastTapRef.current = now;
        singleTapTimerRef.current = setTimeout(handlePlayPause, 250);
      }
    },
    [showCtrl, executeDoubleTapAction, handlePlayPause],
  );

  const handleScreenshot = () => {
    const v = videoRef.current;
    if (!v || !onSendScreenshot) return;
    try {
      const w = v.videoWidth || 1280,
        h = v.videoHeight || 720;
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

  // [Note] Debug Stats: triggered by 'D' hotkey
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
    onToggleChat,
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
        onMuteToggle={() => setMuted((m) => !m)}
        fullscreen={fullscreen}
        onFullscreenToggle={handleFullscreen}
        canControl={canControl}
        playbackRate={playbackRate}
        onSpeedChange={(rate) => canControl && onSpeed?.(rate)}
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
        onToggleChat={onToggleChat}
        unreadCount={unreadCount}
        hasEpisodes={hasEpisodes}
        onToggleEpisodes={onToggleEpisodes}
      />
    </div>
  );
}

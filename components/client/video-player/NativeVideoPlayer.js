"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { formatTime, SpeedPicker, useVideoHotkeys } from "./utils";
import { MAX_RECENT_SUBS } from "@/lib/constants";
import ThumbnailPoster from "./ThumbnailPoster";
import {
  Play as PlayIcon,
  Pause as PauseIcon,
  Volume2 as VolumeIcon,
  VolumeX as MuteIcon,
  Maximize as ExpandIcon,
  Minimize as CompressIcon,
  AlertTriangle as ExclamationIcon,
  Lock as LockSmallIcon,
  Captions as CcIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Camera as CameraIcon,
  PictureInPicture2 as PipIcon,
  Monitor as TheatreIconSvg,
} from "lucide-react";

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
  isHost,
  onLoad,
  onSubtitleChange,
  onAmbiColors,
  screenshotEnabled = true,
  hlsQualityEnabled = true,
  scrubPreviewEnabled = true,
  onSendScreenshot,
  addToast,
  theatreMode = false,
  onToggleTheatre,
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
  const [volumeOsd, setVolumeOsd] = useState(null); // { pct, timer }
  const volumeOsdTimer = useRef(null);

  // ── Scrub preview ─────────────────────────────────────────────────────────
  // hover position: { x (px from bar left), pct (0–1), time (s) } or null
  const [preview, setPreview] = useState(null);
  const previewVideoRef = useRef(null); // hidden <video> for frame capture
  const previewCanvasRef = useRef(null); // hidden <canvas> for drawing
  const previewImgRef = useRef(null); // data URL of the captured frame
  const previewDebounce = useRef(null); // debounce timer for seek
  const previewSeekTime = useRef(null); // last time we seeked the hidden video
  const [videoError, setVideoError] = useState(false);
  const [ccMenuOpen, setCcMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [subOptions, setSubOptions] = useState(null);
  const [searching, setSearching] = useState(false);
  const [posterVisible, setPosterVisible] = useState(true);
  const [isPip, setIsPip] = useState(false);
  const [hlsQuality, setHlsQuality] = useState(null);
  const [pipSupported, setPipSupported] = useState(false);

  const [recentSubs, setRecentSubs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("wt_recentSubs") || "[]");
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
  const seekingRef = useRef(false);
  const hlsRef = useRef(null);
  const canvasRef = useRef(null);
  const ambiRafRef = useRef(null);
  const ambiCurrentRef = useRef({ r: 0, g: 0, b: 0 });
  const ambiDisabledRef = useRef(false);
  const prevOffsetRef = useRef(0);

  useEffect(() => {
    setPipSupported(
      typeof document !== "undefined" && !!document.pictureInPictureEnabled,
    );
  }, []);

  // ── Controls visibility ───────────────────────────────────────────────────
  const showCtrl = useCallback(() => {
    setCtrlVis(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setCtrlVis(false), 3000);
  }, []);

  useEffect(() => {
    showCtrl();
    return () => clearTimeout(hideTimer.current);
  }, [showCtrl]);

  // ── HLS loading ───────────────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v || sourceType !== "hls") return;
    if (v.dataset.lastUrl === videoUrl) return;
    let hls;
    (async () => {
      const Hls = (await import("hls.js")).default;
      if (!Hls.isSupported()) {
        v.src = videoUrl;
        v.dataset.lastUrl = videoUrl;
        return;
      }
      hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(v);
      v.dataset.lastUrl = videoUrl;
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const level = hls.levels[data.level];
        if (level) {
          const h = level.height ? `${level.height}p` : "";
          const bps = level.bitrate
            ? `${(level.bitrate / 1000).toFixed(0)}kbps`
            : "";
          setHlsQuality(h || bps ? { level: h, bitrate: bps } : null);
        }
      });
      hls.on(Hls.Events.ERROR, (_, d) => {
        if (d.fatal)
          setVideoError({
            title: "Stream Error",
            detail: `HLS stream failed: ${d.details || d.type || "Fatal error"}.`,
          });
      });
    })();
    return () => {
      hls?.destroy();
      hlsRef.current = null;
      setHlsQuality(null);
    };
  }, [videoUrl, sourceType, videoRef]);

  // ── Server-commanded playback rate ────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (Math.abs(v.playbackRate - playbackRate) > 0.01)
      v.playbackRate = playbackRate;
  }, [playbackRate, videoRef]);

  // ── Force subtitle track to "showing" mode ───────────────────────────────
  // The `default` attribute on <track> is unreliable — browsers often set mode
  // to "disabled" regardless. Programmatically set mode = "showing" after mount.
  // Note: TextTrack objects (v.textTracks) have NO .src property — only the
  // <track> DOM element does. We match by label only.
  useEffect(() => {
    if (!subtitleUrl || !showSubtitles) return;
    const v = videoRef.current;
    if (!v) return;
    const t = setTimeout(() => {
      for (const track of v.textTracks) {
        track.mode = track.label === "English" ? "showing" : "disabled";
      }
    }, 100);
    return () => clearTimeout(t);
  }, [subtitleUrl, showSubtitles, videoRef]);

  // ── PiP state sync ────────────────────────────────────────────────────────
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

  // ── Native play/pause events (handles PiP window controls) ───────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (sourceType === "mp4" && v.src !== videoUrl) v.src = videoUrl;

    const onTime = () => {
      if (!seekingRef.current) setLocalTime(v.currentTime);
    };
    const onMeta = () => {
      setDuration(v.duration);
      setVideoError(false);
      setPosterVisible(false);
    };
    const onWait = () => setBuffering(true);
    const onCan = () => setBuffering(false);
    const onProg = () => {
      if (v.buffered?.length > 0) {
        const end = v.buffered.end(v.buffered.length - 1);
        setBufferedPct(v.duration > 0 ? (end / v.duration) * 100 : 0);
      }
    };
    const onEnded = () => onPause?.(v.duration);
    const onNativePlay = () => {
      if (!seekingRef.current && !v._suppressNative) onPlay?.(v.currentTime);
    };
    const onNativePause = () => {
      if (!seekingRef.current && !v._suppressNative) onPause?.(v.currentTime);
    };
    const onFS = () => setFullscreen(Boolean(document.fullscreenElement));
    const onErr = () => {
      if (!v.error) {
        setVideoError({
          title: "Playback Error",
          detail:
            "This URL appears to be an embed page, not a direct video file. Paste a direct .mp4, .m3u8, or stream URL.",
        });
        return;
      }
      const MAP = {
        1: ["Loading Cancelled", "Video loading was aborted. Try reloading."],
        2: [
          "Network Error",
          "A network error stopped the download. Check your connection.",
        ],
        3: [
          "Decoding Error",
          "The video file appears corrupt or uses an unsupported codec.",
        ],
        4: [
          "Format Not Supported",
          "This URL cannot be played directly. Paste a direct MP4 or M3U8 stream URL.",
        ],
      };
      const [title, detail] = MAP[v.error.code] || [
        "Unknown Error",
        `Error code ${v.error.code}.`,
      ];
      setVideoError({
        title,
        detail: detail + (v.error.message ? ` (${v.error.message})` : ""),
      });
    };

    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("waiting", onWait);
    v.addEventListener("canplay", onCan);
    v.addEventListener("canplaythrough", onCan);
    v.addEventListener("error", onErr);
    v.addEventListener("progress", onProg);
    v.addEventListener("ended", onEnded);
    v.addEventListener("play", onNativePlay);
    v.addEventListener("pause", onNativePause);
    document.addEventListener("fullscreenchange", onFS);

    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("waiting", onWait);
      v.removeEventListener("canplay", onCan);
      v.removeEventListener("canplaythrough", onCan);
      v.removeEventListener("error", onErr);
      v.removeEventListener("progress", onProg);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("play", onNativePlay);
      v.removeEventListener("pause", onNativePause);
      document.removeEventListener("fullscreenchange", onFS);
    };
  }, [videoRef, videoUrl, sourceType]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted;
  }, [volume, muted, videoRef]);

  useEffect(() => {
    setPosterVisible(true);
    ambiDisabledRef.current = false;
    ambiCurrentRef.current = { r: 0, g: 0, b: 0 };
  }, [videoUrl]);

  // ── Subtitle style injection ──────────────────────────────────────────────
  useEffect(() => {
    let el = document.getElementById("sub-style-engine");
    if (!el) {
      el = document.createElement("style");
      el.id = "sub-style-engine";
      document.head.appendChild(el);
    }
    const shadowMap = {
      none: "none",
      soft: "0 0 6px rgba(0,0,0,0.9)",
      hard: "1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000",
    };
    el.innerHTML = `
      video::cue {
        background: ${subStyle.background} !important;
        color: ${subStyle.color} !important;
        font-size: ${subStyle.fontSize}% !important;
        text-shadow: ${shadowMap[subStyle.shadow || "soft"] || shadowMap.soft};
      }
      ${subStyle.position === "top" ? "video::cue-region { top: 5% !important; }" : ""}
    `;
  }, [subStyle]);

  // ── Subtitle timing offset ────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const delta = subtitleOffset - prevOffsetRef.current;
    prevOffsetRef.current = subtitleOffset;
    for (const track of v.textTracks) {
      if (!track.cues) continue;
      for (const cue of track.cues) {
        cue.startTime = Math.max(0, cue.startTime + delta);
        cue.endTime = Math.max(0, cue.endTime + delta);
      }
    }
  }, [subtitleOffset, videoRef]);

  // ── Ambilight ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!onAmbiColors) return;
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 8;
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let lastT = 0;
    const lerp = (a, b, t) => a + (b - a) * t;
    function sample(now) {
      ambiRafRef.current = requestAnimationFrame(sample);
      if (now - lastT < 83) return; // ~12fps
      lastT = now;
      if (ambiDisabledRef.current || v.paused || v.readyState < 2) return;
      try {
        ctx.drawImage(v, 0, 0, 8, 8);
        const px = ctx.getImageData(0, 0, 8, 8).data;
        let r = 0,
          g = 0,
          b = 0;
        for (let i = 0; i < px.length; i += 4) {
          r += px[i];
          g += px[i + 1];
          b += px[i + 2];
        }
        const n = px.length / 4;
        const cur = ambiCurrentRef.current;
        const sr = lerp(cur.r, r / n, 0.18);
        const sg = lerp(cur.g, g / n, 0.18);
        const sb = lerp(cur.b, b / n, 0.18);
        ambiCurrentRef.current = { r: sr, g: sg, b: sb };
        onAmbiColors({
          r: Math.round(sr),
          g: Math.round(sg),
          b: Math.round(sb),
        });
      } catch (e) {
        if (e instanceof DOMException && e.name === "SecurityError") {
          ambiDisabledRef.current = true;
          onAmbiColors(null);
        }
      }
    }
    ambiRafRef.current = requestAnimationFrame(sample);
    return () => {
      cancelAnimationFrame(ambiRafRef.current);
      onAmbiColors?.(null);
    };
  }, [videoRef, videoUrl, onAmbiColors]);

  // ── Scrub preview — hidden video frame capture ────────────────────────────
  // Only works for direct MP4/HLS (not YouTube/Vimeo — cross-origin canvas taint).
  // A hidden <video> loads the same URL, seeks to hover position, draws to canvas.
  useEffect(() => {
    if (
      !scrubPreviewEnabled ||
      sourceType === "youtube" ||
      sourceType === "vimeo"
    )
      return;
    if (!videoUrl) return;

    const vid = document.createElement("video");
    vid.src = videoUrl;
    vid.muted = true;
    vid.preload = "metadata";
    vid.crossOrigin = "anonymous";
    vid.style.display = "none";
    document.body.appendChild(vid);
    previewVideoRef.current = vid;

    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    previewCanvasRef.current = canvas;

    return () => {
      vid.src = "";
      vid.remove();
      previewVideoRef.current = null;
      previewCanvasRef.current = null;
      previewImgRef.current = null;
      clearTimeout(previewDebounce.current);
    };
  }, [videoUrl, sourceType, scrubPreviewEnabled]);

  const handleSeekBarMouseMove = useCallback(
    (e) => {
      if (!scrubPreviewEnabled || !duration) return;
      if (sourceType === "youtube" || sourceType === "vimeo") return;

      const bar = e.currentTarget;
      const rect = bar.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const pct = x / rect.width;
      const time = pct * duration;

      setPreview({ x, pct, time, img: previewImgRef.current });

      // Debounce the hidden video seek to avoid thrashing
      clearTimeout(previewDebounce.current);
      previewDebounce.current = setTimeout(() => {
        const vid = previewVideoRef.current;
        const can = previewCanvasRef.current;
        if (!vid || !can) return;
        // Only seek if meaningfully different
        if (Math.abs((previewSeekTime.current ?? -999) - time) < 0.5) return;
        previewSeekTime.current = time;
        vid.currentTime = time;
        vid.onseeked = () => {
          try {
            const ctx = can.getContext("2d");
            ctx.drawImage(vid, 0, 0, can.width, can.height);
            previewImgRef.current = can.toDataURL("image/jpeg", 0.6);
            // Update the img in the preview without re-rendering — direct DOM
            setPreview((p) =>
              p ? { ...p, img: previewImgRef.current } : null,
            );
          } catch {
            // Cross-origin taint — disable preview silently
            previewImgRef.current = null;
          }
        };
      }, 120);
    },
    [duration, sourceType, scrubPreviewEnabled],
  );

  const handleSeekBarMouseLeave = useCallback(() => {
    setPreview(null);
    clearTimeout(previewDebounce.current);
  }, []);

  // ── D key → stats overlay ─────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(e.target.tagName))
        return;
      if (e.key === "d" || e.key === "D") setShowStats((v) => !v);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // ── Subtitle search ───────────────────────────────────────────────────────
  async function handleSearchSubs(e) {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSubOptions(null);
    setSearchStatus("");
    try {
      const res = await fetch(
        `/api/subtitles/search?q=${encodeURIComponent(searchQuery.trim())}&url=${encodeURIComponent(videoUrl)}`,
      );
      const data = await res.json();
      if (data.subtitles) setSubOptions(data.subtitles);
      else setSearchStatus(data.error || "No results found.");
    } catch {
      setSearchStatus("Connection failed. Try again.");
    } finally {
      setSearching(false);
    }
  }

  function handleSelectSub(sub) {
    const conn = typeof navigator !== "undefined" && navigator.connection;
    if (
      conn &&
      (conn.saveData || ["slow-2g", "2g"].includes(conn.effectiveType))
    ) {
      addToast?.("Subtitles skipped — slow connection.", "info", 5000);
      setActivePanel(null);
      return;
    }
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${baseUrl}/api/subtitles/download?url=${encodeURIComponent(sub.url)}`;
    onSubtitleChange ? onSubtitleChange(url) : onLoad?.(videoUrl, url);
    const updated = [
      { label: sub.label, url },
      ...recentSubs.filter((s) => s.url !== url),
    ].slice(0, MAX_RECENT_SUBS);
    setRecentSubs(updated);
    try {
      localStorage.setItem("wt_recentSubs", JSON.stringify(updated));
    } catch {}
    setActivePanel(null);
    setSubOptions(null);
    setSearchQuery("");
  }

  // ── Playback handlers ─────────────────────────────────────────────────────
  function handlePlayPause() {
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
  }

  function handleSeekChange(e) {
    if (!canControl) return;
    seekingRef.current = true;
    setLocalTime(Number(e.target.value));
  }

  function handleSeekCommit(e) {
    if (!canControl) return;
    seekingRef.current = false;
    const t = Number(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = t;
    onSeek?.(t);
  }

  function handleVolumeChange(e) {
    const v = Number(e.target.value);
    setVolume(v);
    setMuted(v === 0);
  }

  function showVolumeOsd(newVol) {
    setVolumeOsd(newVol);
    clearTimeout(volumeOsdTimer.current);
    volumeOsdTimer.current = setTimeout(() => setVolumeOsd(null), 1500);
  }

  function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const next = Math.max(0, Math.min(1, volume + delta));
    setVolume(next);
    setMuted(next === 0);
    showVolumeOsd(next);
    showCtrl();
  }

  function handleFullscreen() {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  }

  function handleSpeedChange(rate) {
    if (canControl) onSpeed?.(rate);
  }

  function handleRetry() {
    setVideoError(false);
    videoRef.current?.load();
  }

  async function handlePip() {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement === v) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled && v.readyState >= 1) {
        if (document.pictureInPictureElement)
          await document.exitPictureInPicture();
        await v.requestPictureInPicture();
      }
    } catch (err) {
      console.warn("[PiP]", err.message);
    }
  }

  // Mobile picture-in-picture on tab switch
  useEffect(() => {
    const onVisibilityChange = () => {
      const v = videoRef.current;
      if (!v) return;
      if (
        document.visibilityState === "hidden" &&
        !v.paused &&
        window.innerWidth < 1024
      ) {
        if (
          document.pictureInPictureEnabled &&
          !document.pictureInPictureElement
        ) {
          v.requestPictureInPicture().catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  function handleScreenshot() {
    const v = videoRef.current;
    if (!v || !onSendScreenshot) return;
    try {
      const w = v.videoWidth || 640,
        h = v.videoHeight || 360;
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(w, 1280);
      canvas.height = Math.round(h * (canvas.width / w));
      canvas.getContext("2d").drawImage(v, 0, 0, canvas.width, canvas.height);
      onSendScreenshot(canvas.toDataURL("image/jpeg", 0.75));
      addToast?.("Screenshot sent to chat!", "success");
    } catch {
      addToast?.("Screenshot blocked: cross-origin video.", "error");
    }
  }

  useVideoHotkeys({
    videoRef,
    handlePlayPause,
    handleFullscreen,
    onSeek,
    setMuted,
  });

  const progressPct = duration > 0 ? (localTime / duration) * 100 : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black select-none"
      onMouseMove={showCtrl}
      onTouchStart={showCtrl}
      onWheel={handleWheel}
    >
      {/* Video element — absolute inset-0 so any portal siblings injected into containerRef never shift it */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain"
        playsInline
        autoPlay
        preload="metadata"
        crossOrigin="anonymous"
        onClick={handlePlayPause}
        onDoubleClick={handleFullscreen}
        aria-label="Video player"
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

      <ThumbnailPoster
        visible={posterVisible && !videoError}
        subtitle="Ready to Sync"
      />

      {/* Buffering spinner */}
      {buffering && !videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="w-14 h-14 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
        </div>
      )}

      {/* Subtitle panel */}
      <div
        className={`absolute bottom-24 right-3 sm:right-6 w-full max-w-[360px] sm:max-w-[420px] h-[520px] sm:h-[540px]
          bg-black/55 backdrop-blur-3xl border border-white/15 z-50 transition-all duration-200
          shadow-2xl rounded-[2rem] overflow-hidden flex flex-col
          ${activePanel ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        <div className="p-4 pb-1">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-amber-500/80" />
              <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.25em]">
                Subtitles
              </h3>
            </div>
            <button
              onClick={() => setActivePanel(null)}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 text-white/20 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Tab switcher */}
          <div className="bg-white/5 p-1 rounded-2xl flex relative border border-white/5">
            <div
              className="absolute top-1 bottom-1 bg-white/10 rounded-xl transition-all duration-200"
              style={{
                left:
                  activePanel === "search"
                    ? "4px"
                    : activePanel === "recent"
                      ? "calc(33.33% + 2px)"
                      : "calc(66.66% + 2px)",
                width: "calc(33.33% - 6px)",
              }}
            />
            {["search", "recent", "settings"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActivePanel(tab)}
                className={`flex-1 relative z-10 py-2 text-[8px] font-black uppercase tracking-[0.2em] transition-all
                  ${activePanel === tab ? "text-white" : "text-white/30 hover:text-white/60"}`}
              >
                {tab === "search"
                  ? "Search"
                  : tab === "recent"
                    ? "Recent"
                    : "Styles"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 pt-3">
          {/* Search tab */}
          {activePanel === "search" && (
            <div className="space-y-4">
              <form onSubmit={handleSearchSubs} className="relative">
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find a track…"
                  className="w-full bg-white/5 border border-white/10 rounded-[2rem] px-5 py-2.5 text-xs text-white placeholder:text-white/20 focus:border-amber-500/40 outline-none transition-all"
                />
                <button
                  disabled={searching || !searchQuery.trim()}
                  type="submit"
                  className="absolute right-1 top-1 bottom-1 w-8 rounded-full bg-amber-500 text-void transition-all disabled:opacity-30 active:scale-95"
                >
                  {searching ? (
                    <div className="w-3 h-3 border-2 border-void/30 border-t-void rounded-full animate-spin mx-auto" />
                  ) : (
                    <SearchIcon className="w-3 h-3 mx-auto" />
                  )}
                </button>
              </form>
              {searchStatus && !subOptions && (
                <div className="text-center py-12 opacity-40 text-[10px] uppercase font-bold tracking-widest px-4 leading-relaxed">
                  {searchStatus}
                </div>
              )}
              {subOptions && (
                <div className="space-y-1">
                  {subOptions.length === 0 ? (
                    <div className="text-center py-12 opacity-20 text-[9px] uppercase font-bold tracking-widest">
                      No Results
                    </div>
                  ) : (
                    subOptions.map((sub) => {
                      const subUrl = `${window.location.origin}/api/subtitles/download?url=${encodeURIComponent(sub.url)}`;
                      const isActive = subtitleUrl === subUrl;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleSelectSub(sub)}
                          className={`w-full min-w-0 text-left px-4 py-2.5 rounded-[1.5rem] transition-all border flex items-center justify-between overflow-hidden
                              ${
                                isActive
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500 font-bold"
                                  : "bg-white/5 border-transparent hover:border-white/10 text-white/40 hover:text-white/80"
                              }`}
                        >
                          <span className="text-[11px] truncate min-w-0 mr-2">
                            {sub.label}
                          </span>
                          {isActive && (
                            <div className="w-1 h-1 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* Recent tab */}
          {activePanel === "recent" && (
            <div className="space-y-1">
              {recentSubs.length === 0 ? (
                <div className="text-center py-16 opacity-20 text-[9px] uppercase font-bold tracking-widest leading-loose">
                  No recent subtitles.
                  <br />
                  Search to add one.
                </div>
              ) : (
                <>
                  {recentSubs.map((sub) => {
                    const isActive = subtitleUrl === sub.url;
                    return (
                      <div
                        key={sub.url}
                        className="flex items-center gap-1.5 group/sub w-full overflow-hidden"
                      >
                        <button
                          onClick={() => {
                            onSubtitleChange?.(sub.url);
                            setActivePanel(null);
                          }}
                          className={`flex-1 min-w-0 text-left px-3 py-2.5 rounded-[1.5rem] transition-all border flex items-center gap-2 overflow-hidden
                            ${
                              isActive
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-500 font-bold"
                                : "bg-white/5 border-transparent hover:border-white/10 text-white/40 hover:text-white/80"
                            }`}
                        >
                          <span className="text-[11px] truncate block min-w-0 flex-1">
                            {sub.label}
                          </span>
                          {isActive && (
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            const u = recentSubs.filter(
                              (s) => s.url !== sub.url,
                            );
                            setRecentSubs(u);
                            try {
                              localStorage.setItem(
                                "wt_recentSubs",
                                JSON.stringify(u),
                              );
                            } catch {}
                          }}
                          title="Remove"
                          className="opacity-0 group-hover/sub:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-full bg-danger/10 hover:bg-danger/25 text-danger/60 hover:text-danger border border-danger/15 shrink-0 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                  {recentSubs.length > 1 && (
                    <button
                      onClick={() => {
                        setRecentSubs([]);
                        try {
                          localStorage.removeItem("wt_recentSubs");
                        } catch {}
                      }}
                      className="w-full mt-2 py-2 text-[9px] font-bold uppercase tracking-widest text-white/20 hover:text-danger/60 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Settings / Styles tab */}
          {activePanel === "settings" && (
            <div className="space-y-5">
              <section>
                <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2.5 block ml-1">
                  Scale
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[50, 75, 100, 125].map((sz) => (
                    <button
                      key={sz}
                      onClick={() =>
                        setSubStyle((s) => ({ ...s, fontSize: sz }))
                      }
                      className={`py-2 rounded-xl border text-[9px] font-bold transition-all
                        ${
                          subStyle.fontSize === sz
                            ? "bg-amber-500 border-amber-500 text-void shadow-lg shadow-amber-500/20"
                            : "bg-white/5 border-white/5 text-white/40 hover:text-white hover:border-white/10"
                        }`}
                    >
                      {sz}%
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2.5 block ml-1">
                  Color
                </label>
                <div className="bg-white/5 p-2 rounded-2xl border border-white/5 flex items-center justify-between">
                  {[
                    "#ffffff",
                    "#ffee00",
                    "#00ffcc",
                    "#ff3366",
                    "#ff9900",
                    "#aaffaa",
                  ].map((c) => (
                    <button
                      key={c}
                      onClick={() => setSubStyle((s) => ({ ...s, color: c }))}
                      className="p-0.5"
                    >
                      <div
                        className={`w-6 h-6 rounded-full transition-all border-2 ${subStyle.color === c ? "border-amber-500 scale-110" : "border-transparent opacity-50 hover:opacity-100"}`}
                        style={{ backgroundColor: c }}
                      />
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2.5 block ml-1">
                  Background
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["rgba(0,0,0,0)", "None"],
                    ["rgba(0,0,0,0.6)", "Box"],
                    ["rgba(0,0,0,0.85)", "Solid"],
                  ].map(([bg, label]) => (
                    <button
                      key={label}
                      onClick={() =>
                        setSubStyle((s) => ({ ...s, background: bg }))
                      }
                      className={`py-2 rounded-xl border transition-all text-[8px] font-black uppercase tracking-widest
                        ${
                          subStyle.background === bg
                            ? "bg-amber-500 border-amber-500 text-void shadow-lg shadow-amber-500/20"
                            : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2.5 block ml-1">
                  Position
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["bottom", "Bottom"],
                    ["top", "Top"],
                  ].map(([pos, label]) => (
                    <button
                      key={pos}
                      onClick={() =>
                        setSubStyle((s) => ({ ...s, position: pos }))
                      }
                      className={`py-2 rounded-xl border transition-all text-[8px] font-bold uppercase tracking-wider
                        ${
                          (subStyle.position || "bottom") === pos
                            ? "bg-amber-500 border-amber-500 text-void shadow-lg shadow-amber-500/20"
                            : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2.5 block ml-1">
                  Text shadow
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["none", "Off"],
                    ["soft", "Soft"],
                    ["hard", "Strong"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() =>
                        setSubStyle((s) => ({ ...s, shadow: key }))
                      }
                      className={`py-2 rounded-xl border transition-all text-[8px] font-bold uppercase tracking-wider
                        ${
                          (subStyle.shadow || "soft") === key
                            ? "bg-amber-500 border-amber-500 text-void shadow-lg shadow-amber-500/20"
                            : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {subtitleUrl && (
                <section>
                  <div className="flex items-center justify-between mb-2.5 ml-1">
                    <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">
                      Timing offset
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[11px] font-mono font-bold tabular-nums ${subtitleOffset === 0 ? "text-white/25" : subtitleOffset > 0 ? "text-jade/80" : "text-danger/80"}`}
                      >
                        {subtitleOffset > 0 ? "+" : ""}
                        {subtitleOffset.toFixed(1)}s
                      </span>
                      {subtitleOffset !== 0 && (
                        <button
                          onClick={() => setSubtitleOffset(0)}
                          className="text-[9px] font-bold text-white/20 hover:text-white/60 transition-colors px-1.5 py-0.5 rounded-full hover:bg-white/5"
                        >
                          reset
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="relative h-8 flex items-center">
                    <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/8">
                      <div
                        className="absolute top-0 bottom-0 rounded-full bg-amber-500/60"
                        style={{
                          left:
                            subtitleOffset < 0
                              ? `${50 + (subtitleOffset / 15) * 50}%`
                              : "50%",
                          right:
                            subtitleOffset > 0
                              ? `${50 - (subtitleOffset / 15) * 50}%`
                              : "50%",
                        }}
                      />
                      <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-white/20" />
                    </div>
                    <input
                      type="range"
                      min={-15}
                      max={15}
                      step={0.1}
                      value={subtitleOffset}
                      onChange={(e) =>
                        setSubtitleOffset(Number(e.target.value))
                      }
                      className="relative w-full opacity-0 cursor-pointer h-8"
                    />
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {[-5, -2, -1, -0.5, +0.5, +1, +2, +5].map((v) => (
                      <button
                        key={v}
                        onClick={() =>
                          setSubtitleOffset((p) =>
                            parseFloat((p + v).toFixed(1)),
                          )
                        }
                        className="flex-1 py-1.5 rounded-lg border text-[8px] font-bold transition-all bg-white/4 border-white/8 text-white/30 hover:text-white/70 hover:bg-white/8"
                      >
                        {v > 0 ? `+${v}` : v}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-white/20 font-mono mt-2 ml-1">
                    Negative = earlier · Positive = later
                  </p>
                </section>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error overlay */}
      {videoError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-void/92 backdrop-blur-xl gap-5 text-center px-6 z-30">
          <div className="w-14 h-14 rounded-[2rem] bg-danger/10 flex items-center justify-center border border-danger/20 shrink-0">
            <ExclamationIcon className="w-7 h-7 text-danger" />
          </div>
          <div className="max-w-sm w-full">
            <h3 className="font-display font-bold text-lg text-white/90">
              {typeof videoError === "object"
                ? videoError.title
                : "Playback Error"}
            </h3>
            <p className="text-sm text-white/50 mt-2 leading-relaxed">
              {typeof videoError === "object" ? videoError.detail : videoError}
            </p>
            {typeof videoError === "object" &&
              videoError.title === "Format Not Supported" && (
                <div className="mt-4 flex flex-col gap-2 text-left">
                  <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                    Try instead:
                  </p>
                  {[
                    "Direct .mp4 or .m3u8 stream URL",
                    "YouTube or Vimeo link",
                    "CDN/proxy URL ending in .mp4",
                  ].map((tip) => (
                    <div
                      key={tip}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-[2rem] bg-white/4 border border-white/8"
                    >
                      <span className="w-1 h-1 rounded-full bg-jade shrink-0" />
                      <span className="text-[11px] text-white/50">{tip}</span>
                    </div>
                  ))}
                </div>
              )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="h-10 px-6 rounded-[2rem] bg-amber-500 text-void font-black text-xs uppercase tracking-widest hover:bg-amber-400 active:scale-95 transition-all"
            >
              Try Again
            </button>
            <button
              onClick={() => setVideoError(false)}
              className="h-10 px-5 rounded-[2rem] glass-card text-white/50 hover:text-white text-xs font-bold transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Volume OSD — floating pill shown on scroll-wheel / arrow-key change ── */}
      {volumeOsd !== null && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none animate-in fade-in duration-150">
          <div className="flex flex-col items-center gap-2 px-5 py-3 rounded-2xl bg-black/75 backdrop-blur-md border border-white/15 shadow-2xl min-w-[110px]">
            {/* Icon */}
            <div className="text-white/90">
              {volumeOsd === 0 ? (
                <MuteIcon className="w-5 h-5" />
              ) : volumeOsd < 0.4 ? (
                <VolumeIcon className="w-5 h-5 opacity-60" />
              ) : (
                <VolumeIcon className="w-5 h-5" />
              )}
            </div>
            {/* Bar */}
            <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-white transition-all duration-100"
                style={{ width: `${Math.round(volumeOsd * 100)}%` }}
              />
            </div>
            {/* Percentage */}
            <span className="text-[11px] font-mono font-bold text-white/80 tabular-nums">
              {Math.round(volumeOsd * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Stats overlay (D key) */}
      {showStats && (
        <div className="absolute top-3 left-3 z-40 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/10 space-y-1 min-w-[200px]">
            <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.25em] mb-1.5">
              Debug Stats · D to hide
            </p>
            {[
              ["Time", `${formatTime(localTime)} / ${formatTime(duration)}`],
              ["Buffered", `${bufferedPct.toFixed(0)}%`],
              [
                "Rate",
                `${videoRef.current?.playbackRate?.toFixed(3) ?? playbackRate}×`,
              ],
              [
                "Resolution",
                videoRef.current
                  ? `${videoRef.current.videoWidth}×${videoRef.current.videoHeight}`
                  : "—",
              ],
              [
                "ReadyState",
                videoRef.current ? String(videoRef.current.readyState) : "—",
              ],
              [
                "Dropped",
                videoRef.current?.getVideoPlaybackQuality?.()
                  ?.droppedVideoFrames ?? "—",
              ],
              [
                "HLS",
                hlsQuality
                  ? `${hlsQuality.level || "?"} ${hlsQuality.bitrate || ""}`.trim()
                  : sourceType === "hls"
                    ? "loading"
                    : "n/a",
              ],
              ["Buffering", buffering ? "yes" : "no"],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between gap-4">
                <span className="text-[10px] font-mono text-white/35">
                  {label}
                </span>
                <span className="text-[10px] font-mono text-white/75 font-bold">
                  {String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Control bar ── */}
      <div
        className={`video-controls absolute inset-x-0 bottom-0 z-20 transition-all duration-300
        ${ctrlVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
        <div className="relative px-3 sm:px-4 pb-3 sm:pb-4 pt-8 space-y-2">
          {/* Seek bar + scrub preview */}
          <div
            className="relative"
            onMouseMove={handleSeekBarMouseMove}
            onMouseLeave={handleSeekBarMouseLeave}
          >
            {/* Preview tooltip */}
            {preview && scrubPreviewEnabled && (
              <div
                className="absolute bottom-full mb-3 pointer-events-none z-50"
                style={{
                  left: `clamp(80px, ${preview.x}px, calc(100% - 80px))`,
                  transform: "translateX(-50%)",
                }}
              >
                <div className="flex flex-col items-center gap-1.5">
                  {/* Thumbnail */}
                  <div className="w-40 h-[90px] rounded-lg overflow-hidden bg-black/70 border border-white/15 shadow-2xl">
                    {preview.img ? (
                      <img
                        src={preview.img}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  {/* Time label */}
                  <span className="text-[11px] font-mono font-bold text-white bg-black/70 px-2 py-0.5 rounded-full border border-white/10">
                    {formatTime(preview.time)}
                  </span>
                </div>
              </div>
            )}

            {/* Track */}
            <div className="relative h-1.5 bg-white/15 rounded-full hover:h-2 transition-all duration-150 cursor-pointer overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-white/20"
                style={{ width: `${bufferedPct}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
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
                aria-label="Seek"
                className="absolute inset-0 w-full opacity-0 cursor-pointer py-3"
              />
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-1.5">
            {/* Play */}
            <button
              onClick={handlePlayPause}
              aria-label={isPlaying ? "Pause" : "Play"}
              disabled={!canControl}
              className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full border border-white/10 transition-all active:scale-90 shrink-0
                ${canControl ? "bg-white/10 hover:bg-white/20 text-white" : "bg-white/4 text-white/30 cursor-not-allowed"}`}
            >
              {isPlaying ? (
                <PauseIcon className="w-4 h-4" />
              ) : (
                <PlayIcon className="w-4 h-4 ml-px" />
              )}
            </button>

            {/* Volume */}
            <div className="flex items-center group/vol shrink-0">
              <button
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? "Unmute" : "Mute"}
                className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                {muted || volume === 0 ? (
                  <MuteIcon className="w-4 h-4" />
                ) : (
                  <VolumeIcon className="w-4 h-4" />
                )}
              </button>
              <div className="w-0 group-hover/vol:w-16 sm:group-hover/vol:w-20 transition-all duration-300 overflow-hidden hidden sm:flex items-center h-8">
                <div
                  className="relative h-1.5 ml-2 bg-white/15 rounded-full cursor-pointer overflow-hidden"
                  style={{ width: "calc(100% - 8px)" }}
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-white/80 rounded-full pointer-events-none"
                    style={{ width: `${(muted ? 0 : volume) * 100}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Time */}
            <span className="text-[10px] font-mono text-white/75 tabular-nums shrink-0 hidden xs:inline">
              {formatTime(localTime)} / {formatTime(duration)}
            </span>

            {/* HLS badge */}
            {hlsQualityEnabled && hlsQuality && sourceType === "hls" && (
              <span className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-full bg-jade/10 border border-jade/20 text-[9px] font-mono font-bold text-jade/70 shrink-0">
                {hlsQuality.level}
                {hlsQuality.level && hlsQuality.bitrate && " · "}
                {hlsQuality.bitrate}
              </span>
            )}

            {/* Host-only lock */}
            {!canControl && (
              <span className="text-[9px] font-mono text-amber-400/60 flex items-center gap-1 shrink-0">
                <LockSmallIcon className="w-3 h-3" />
                <span className="hidden sm:inline uppercase tracking-wider">
                  Host only
                </span>
              </span>
            )}

            <div className="flex-1 min-w-0" />

            {/* Subtitle pill */}
            <div
              className="flex items-center bg-white/8 border border-white/10 rounded-full p-0.5 transition-all duration-400 overflow-hidden shrink-0"
              style={{ maxWidth: ccMenuOpen ? "220px" : "36px", width: "auto" }}
            >
              <button
                onClick={() => {
                  if (!ccMenuOpen) setCcMenuOpen(true);
                  else if (subtitleUrl) setShowSubtitles((s) => !s);
                }}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all shrink-0
                  ${!subtitleUrl ? "text-white/40 hover:text-white" : showSubtitles ? "bg-amber-500 text-void" : "text-white/60 hover:text-white"}`}
              >
                <CcIcon className="w-3.5 h-3.5" />
              </button>
              {ccMenuOpen && (
                <div className="flex items-center gap-0.5 pl-0.5 animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="w-px h-4 bg-white/15 mx-0.5 shrink-0" />
                  <button
                    onClick={() => setActivePanel("search")}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-all hover:bg-white/10 ${activePanel === "search" ? "text-amber-400" : "text-white/50 hover:text-white"}`}
                  >
                    <SearchIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setActivePanel("recent")}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-all hover:bg-white/10 ${activePanel === "recent" ? "text-amber-400" : "text-white/50 hover:text-white"}`}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setActivePanel("settings")}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-all hover:bg-white/10 ${activePanel === "settings" ? "text-amber-400" : "text-white/50 hover:text-white"}`}
                  >
                    <SettingsIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setActivePanel(null);
                      setCcMenuOpen(false);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-white/30 hover:text-white transition-all hover:bg-white/10 shrink-0"
                  >
                    <svg
                      className="w-3 h-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              {!ccMenuOpen && (
                <button
                  onClick={() => setCcMenuOpen(true)}
                  className="hidden"
                  aria-hidden
                />
              )}
            </div>

            {/* Speed — pill trigger, rectangular dropdown */}
            {canControl && (
              <SpeedPicker value={playbackRate} onChange={handleSpeedChange} />
            )}

            {/* PiP */}
            {pipSupported && (
              <button
                onClick={handlePip}
                title="Picture-in-Picture"
                className={`hidden sm:flex w-8 h-8 items-center justify-center rounded-full border transition-all active:scale-90
                  ${isPip ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-white/8 hover:bg-white/18 border-white/10 text-white/70 hover:text-white"}`}
              >
                <PipIcon className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Screenshot */}
            {screenshotEnabled && onSendScreenshot && (
              <button
                onClick={handleScreenshot}
                title="Screenshot to chat"
                className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full bg-white/8 hover:bg-white/18 border border-white/10 text-white/70 hover:text-white transition-all active:scale-90"
              >
                <CameraIcon className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Theatre */}
            {onToggleTheatre && (
              <button
                onClick={onToggleTheatre}
                title={theatreMode ? "Exit theatre (T)" : "Theatre mode (T)"}
                className={`hidden sm:flex w-8 h-8 items-center justify-center rounded-full border transition-all active:scale-90
                  ${theatreMode ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-white/8 hover:bg-white/18 border-white/10 text-white/70 hover:text-white"}`}
              >
                <TheatreIconSvg className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              aria-label="Toggle fullscreen"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all active:scale-90 shrink-0"
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

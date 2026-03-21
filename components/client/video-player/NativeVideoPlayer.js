"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { formatTime, SpeedPicker, useVideoHotkeys } from "./utils";
import ThumbnailPoster from "./ThumbnailPoster";
import {
  PlayIcon,
  PauseIcon,
  VolumeIcon,
  MuteIcon,
  ExpandIcon,
  CompressIcon,
  ExclamationIcon,
  LockSmallIcon,
  CcIcon,
  SearchIcon,
  SettingsIcon,
} from "../Icons";

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
  chatOverlay,
  onLoad,
  onSubtitleChange,
  // Ambilight: callback receives {r,g,b} or null
  onAmbiColors,
  ambiEnabled = true,
  screenshotEnabled = true,
  hlsQualityEnabled = true,
  onSendScreenshot,
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
  const [videoError, setVideoError] = useState(false);
  const [ccMenuOpen, setCcMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [subOptions, setSubOptions] = useState(null);
  const [searching, setSearching] = useState(false);
  const [posterVisible, setPosterVisible] = useState(true);
  const [isPip, setIsPip] = useState(false);
  const [canPip, setCanPip] = useState(false);
  // HLS quality indicator: { level: string, bitrate: string }
  const [hlsQuality, setHlsQuality] = useState(null);
  const [recentSubs, setRecentSubs] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("wt_recentSubs");
      if (saved) setRecentSubs(JSON.parse(saved));
    } catch {}
  }, []);

  const [subStyle, setSubStyle] = useState({
    fontSize: 100, color: "#ffffff", background: "rgba(0,0,0,0)",
  });

  const containerRef = useRef(null);
  const hideTimer    = useRef(null);
  const seekingRef   = useRef(false);
  const hlsRef       = useRef(null); // keep hls instance for quality reading
  // Ambilight internals
  const canvasRef       = useRef(null);
  const ambiRafRef      = useRef(null);
  const ambiCurrentRef  = useRef({ r: 0, g: 0, b: 0 });
  const ambiDisabledRef = useRef(false);

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
    const lastUrl = v.dataset.lastUrl;
    if (lastUrl === videoUrl) return;

    let hls;
    (async () => {
      const Hls = (await import("hls.js")).default;
      if (!Hls.isSupported()) {
        v.src = videoUrl; v.dataset.lastUrl = videoUrl; return;
      }
      hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(v);
      v.dataset.lastUrl = videoUrl;

      // HLS quality indicator
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const level = hls.levels[data.level];
        if (level) {
          const h = level.height ? `${level.height}p` : "";
          const bps = level.bitrate ? `${(level.bitrate / 1000).toFixed(0)} kbps` : "";
          setHlsQuality(h || bps ? { level: h, bitrate: bps } : null);
        }
      });

      hls.on(Hls.Events.ERROR, (_, d) => {
        if (d.fatal) setVideoError(`HLS Stream Error: ${d.details || d.type || "Fatal Connection Error"}`);
      });
    })();
    return () => { hls?.destroy(); hlsRef.current = null; setHlsQuality(null); };
  }, [videoUrl, sourceType, videoRef]);

  // Apply server-commanded playbackRate to the video element
  // This was missing — the SpeedPicker showed the right value but the video ignored it
  useEffect(() => {
    const v = videoRef.current;
    if (!v || typeof v.playbackRate === "undefined") return;
    if (Math.abs(v.playbackRate - playbackRate) > 0.01) v.playbackRate = playbackRate;
  }, [playbackRate, videoRef]);

  // PiP state sync
  useEffect(() => {
    const v = videoRef.current;
    if (typeof document !== "undefined") {
      setCanPip(!!document.pictureInPictureEnabled);
    }
    if (!v) return;
    const onEnterPip = () => setIsPip(true);
    const onLeavePip = () => setIsPip(false);
    v.addEventListener("enterpictureinpicture", onEnterPip);
    v.addEventListener("leavepictureinpicture", onLeavePip);
    return () => {
      v.removeEventListener("enterpictureinpicture", onEnterPip);
      v.removeEventListener("leavepictureinpicture", onLeavePip);
    };
  }, [videoRef]);

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
      if (data.subtitles) {
        setSubOptions(data.subtitles);
      } else {
        setSearchStatus(data.error || "No results found.");
      }
    } catch {
      setSearchStatus("Connection failed. Try again.");
    } finally {
      setSearching(false);
    }
  }

  function handleSelectSub(sub) {
    if (!sub?.url) return;
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    let finalSubUrl = sub.url;
    // If it's not already a processed proxy URL, process it
    if (!sub.url.includes("/api/subtitles/download")) {
      finalSubUrl = `${baseUrl}/api/subtitles/download?url=${encodeURIComponent(sub.url)}`;
    }
    
    if (onSubtitleChange) {
      onSubtitleChange(finalSubUrl);
    } else {
      onLoad?.(videoUrl, finalSubUrl);
    }

    // Save/Update recent subtitle history
    setRecentSubs((prev) => {
      const updated = [
        { label: sub.label, url: finalSubUrl },
        ...prev.filter((s) => s.url !== finalSubUrl),
      ].slice(0, 5);
      try {
        localStorage.setItem("wt_recentSubs", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setActivePanel(null);
    setSubOptions(null);
    setSearchQuery("");
  }

  useEffect(() => {
    const styleId = "sub-style-engine";
    let el = document.getElementById(styleId);
    if (!el) {
      el = document.createElement("style");
      el.id = styleId;
      document.head.appendChild(el);
    }
    el.innerHTML = `
      video::cue {
        background: ${subStyle.background} !important;
        color: ${subStyle.color} !important;
        font-size: ${subStyle.fontSize}% !important;
        text-shadow: 0 0 4px rgba(0,0,0,0.8);
      }
    `;
  }, [subStyle]);

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
      setPosterVisible(false); // hide poster once video metadata is ready
    };
    const onWait = () => setBuffering(true);
    const onCan = () => setBuffering(false);
    const onErr = () => {
      if (!v.error) {
        setVideoError(
          "Unsupported format or iframe/embed webpage. You must provide a direct .mp4 or .m3u8 file.",
        );
        return;
      }
      let errStr = "";
      switch (v.error.code) {
        case 1:
          errStr = "Loading aborted.";
          break;
        case 2:
          errStr = "Network error caused download to fail.";
          break;
        case 3:
          errStr = "Corrupted video file.";
          break;
        case 4:
          errStr =
            "Source format not supported. If this is an iframe/embed webpage (like vidsrc), it cannot be synced. Paste a direct MP4/M3U8.";
          break;
        default:
          errStr = `Unknown Native Error Code: ${v.error.code}`;
      }
      if (v.error.message) errStr += ` - ${v.error.message}`;
      setVideoError(errStr);
    };
    const onProg = () => {
      if (v.buffered && v.buffered.length > 0) {
        const end = v.buffered.end(v.buffered.length - 1);
        setBufferedPct(v.duration > 0 ? (end / v.duration) * 100 : 0);
      }
    };
    const onEnded = () => {
      onPause?.(v.duration);
    };
    const onFS = () => setFullscreen(Boolean(document.fullscreenElement));
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("waiting", onWait);
    v.addEventListener("canplay", onCan);
    v.addEventListener("canplaythrough", onCan);
    v.addEventListener("error", onErr);
    v.addEventListener("progress", onProg);
    v.addEventListener("ended", onEnded);
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
      document.removeEventListener("fullscreenchange", onFS);
    };
  }, [videoRef, videoUrl, sourceType]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted;
  }, [volume, muted, videoRef]);

  // Reset poster whenever the video URL changes (new video loading)
  useEffect(() => {
    setPosterVisible(true);
    ambiDisabledRef.current = false;
  }, [videoUrl]);

  // ── Ambilight glow ─────────────────────────────────────────────────────
  // Samples the <video> frame at ~12fps via a tiny 8×8 canvas, averaging
  // edge-pixel colours and forwarding them via onAmbiColors(). The parent
  // (RoomClient) applies the colour as a box-shadow on the player section.
  // If the video is cross-origin (shouldn't happen for direct MP4/HLS but
  // just in case), a SecurityError is caught and sampling is disabled.
  useEffect(() => {
    if (!onAmbiColors || !ambiEnabled) {
      onAmbiColors?.(null);
      return;
    }
    const v = videoRef.current;
    if (!v) return;

    const CANVAS_W = 8;
    const CANVAS_H = 8;
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let lastFrameTime = 0;
    const FRAME_INTERVAL = 1000 / 12; // 12 fps

    function lerp(a, b, t) { return a + (b - a) * t; }

    function sample(now) {
      ambiRafRef.current = requestAnimationFrame(sample);
      if (now - lastFrameTime < FRAME_INTERVAL) return;
      lastFrameTime = now;

      if (ambiDisabledRef.current || v.paused || v.readyState < 2) return;

      try {
        ctx.drawImage(v, 0, 0, CANVAS_W, CANVAS_H);
        const pixels = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          r += pixels[i];
          g += pixels[i + 1];
          b += pixels[i + 2];
          count++;
        }
        if (count === 0) return;
        const nr = r / count;
        const ng = g / count;
        const nb = b / count;

        // Smooth interpolation so colour transitions aren't jarring
        const cur = ambiCurrentRef.current;
        const sr = lerp(cur.r, nr, 0.08);
        const sg = lerp(cur.g, ng, 0.08);
        const sb = lerp(cur.b, nb, 0.08);
        ambiCurrentRef.current = { r: sr, g: sg, b: sb };
        onAmbiColors({ r: Math.round(sr), g: Math.round(sg), b: Math.round(sb) });
      } catch (err) {
        if (err instanceof DOMException && err.name === "SecurityError") {
          // Cross-origin taint — disable permanently for this video
          ambiDisabledRef.current = true;
          onAmbiColors(null);
        }
      }
    }

    ambiRafRef.current = requestAnimationFrame(sample);

    return () => {
      if (ambiRafRef.current) cancelAnimationFrame(ambiRafRef.current);
      onAmbiColors?.(null); // clear glow on unmount
    };
  }, [videoRef, videoUrl, onAmbiColors]);

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
    if (!canControl) return; // viewers must not be able to scrub locally
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

  async function handlePip() {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await v.requestPictureInPicture();
      }
    } catch {}
  }

  function handleScreenshot() {
    const v = videoRef.current;
    if (!v || !onSendScreenshot) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width  = v.videoWidth  || 320;
      canvas.height = v.videoHeight || 180;
      canvas.getContext("2d").drawImage(v, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      onSendScreenshot(dataUrl);
    } catch {}
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
      >
        {subtitleUrl && showSubtitles && (
          <track
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

      {buffering && !videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="w-14 h-14 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
        </div>
      )}

      <div
        className={`absolute bottom-24 right-6 w-full max-w-[420px] h-[540px] bg-black/30 backdrop-blur-2xl border border-white/10 z-50 transition-all duration-200 shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col
            ${activePanel ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        <div className="p-5 pb-1">
          <div className="flex items-center justify-between mb-5 px-1">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-amber-500/80" />
              <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.25em]">Subtitles</h3>
            </div>
            <button onClick={() => setActivePanel(null)}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 text-white/20 hover:text-white transition-colors">
              ✕
            </button>
          </div>

          <div className="bg-white/5 p-1 rounded-2xl flex relative border border-white/5">
            <div className="absolute top-1 bottom-1 bg-white/10 rounded-xl transition-all duration-200"
              style={{
                left: activePanel === "search" ? "4px" : activePanel === "recent" ? "calc(33.33% + 2px)" : "calc(66.66% + 2px)",
                width: "calc(33.33% - 6px)",
              }} />
            {["search", "recent", "settings"].map((tab) => (
              <button key={tab} onClick={() => setActivePanel(tab)}
                className={`flex-1 relative z-10 py-2 text-[8px] font-black uppercase tracking-[0.2em] transition-all
                  ${activePanel === tab ? "text-white" : "text-white/30 hover:text-white/60"}`}>
                {tab === "search" ? "Search" : tab === "recent" ? "Recent" : "Styles"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pt-3 custom-scrollbar">
          {activePanel === "search" && (
            <div className="space-y-4">
              <form onSubmit={handleSearchSubs} className="relative">
                <input autoFocus type="text" value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find a track..."
                  className="w-full bg-white/5 border border-white/10 rounded-[2rem] px-5 py-2.5 text-xs text-white placeholder:text-white/20 focus:border-amber-500/40 outline-none transition-all" />
                <button disabled={searching || !searchQuery.trim()} type="submit"
                  className="absolute right-1 top-1 bottom-1 w-8 rounded-full bg-amber-500 text-void transition-all disabled:opacity-30 active:scale-95">
                  {searching
                    ? <div className="w-3 h-3 border-2 border-void/30 border-t-void rounded-full animate-spin mx-auto" />
                    : <SearchIcon className="w-3 h-3 mx-auto" />}
                </button>
              </form>
              {searchStatus && !subOptions && (
                <div className="text-center py-12 opacity-40 text-[10px] uppercase font-bold tracking-widest px-4 leading-relaxed">{searchStatus}</div>
              )}
              {subOptions && (
                <div className="space-y-1">
                  {subOptions.length === 0
                    ? <div className="text-center py-12 opacity-20 text-[9px] uppercase font-bold tracking-widest">No Results</div>
                    : subOptions.map((sub) => {
                        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
                        const subUrl  = `${baseUrl}/api/subtitles/download?url=${encodeURIComponent(sub.url)}`;
                        const isActive = subtitleUrl === subUrl;
                        return (
                          <button key={sub.id} onClick={() => handleSelectSub(sub)}
                            className={`w-full text-left px-4 py-2.5 rounded-[1.5rem] transition-all border flex items-center justify-between group
                              ${isActive ? "bg-amber-500/10 border-amber-500/30 text-amber-500 font-bold"
                                         : "bg-white/5 border-transparent hover:border-white/10 text-white/40 hover:text-white/80"}`}>
                            <span className="text-[11px] truncate pr-3">{sub.label}</span>
                            {isActive && <div className="w-1 h-1 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />}
                          </button>
                        );
                      })}
                </div>
              )}
            </div>
          )}

          {activePanel === "recent" && (
            <div className="space-y-1">
              {recentSubs.length === 0 ? (
                <div className="text-center py-16 opacity-20 text-[9px] uppercase font-bold tracking-widest">
                  No recent subtitles.<br />Search to add one.
                </div>
              ) : recentSubs.map((sub) => {
                const isActive = subtitleUrl === sub.url;
                return (
                  <button key={sub.url} onClick={() => handleSelectSub(sub)}
                    className={`w-full text-left px-4 py-2.5 rounded-[1.5rem] transition-all border flex items-center justify-between
                      ${isActive ? "bg-amber-500/10 border-amber-500/30 text-amber-500 font-bold"
                                 : "bg-white/5 border-transparent hover:border-white/10 text-white/40 hover:text-white/80"}`}>
                    <span className="text-[11px] truncate pr-3">{sub.label}</span>
                    {isActive && <div className="w-1 h-1 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />}
                  </button>
                );
              })}
            </div>
          )}

          {activePanel === "settings" && (
            <div className="space-y-6">
              <section>
                <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2.5 block ml-1">Scale</label>
                <div className="grid grid-cols-4 gap-2">
                  {[50, 75, 100, 125].map((sz) => (
                    <button key={sz} onClick={() => setSubStyle((s) => ({ ...s, fontSize: sz }))}
                      className={`py-2 rounded-[1.25rem] border text-[9px] font-bold transition-all
                        ${subStyle.fontSize === sz ? "bg-amber-500 border-amber-500 text-void shadow-lg shadow-amber-500/20"
                                                   : "bg-white/5 border-white/5 text-white/40 hover:text-white hover:border-white/10"}`}>
                      {sz}%
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2.5 block ml-1">Color</label>
                <div className="bg-white/5 p-2 rounded-[1.5rem] border border-white/5 flex items-center justify-between">
                  {["#ffffff","#ffee00","#00ffcc","#ff3366","#ff9900"].map((c) => (
                    <button key={c} onClick={() => setSubStyle((s) => ({ ...s, color: c }))}
                      className="group relative flex items-center justify-center p-0.5">
                      <div className={`w-6 h-6 rounded-full transition-all border-2 ${subStyle.color === c ? "border-amber-500" : "border-transparent opacity-40 hover:opacity-100"}`}
                        style={{ backgroundColor: c }} />
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2.5 block ml-1">Modes</label>
                <div className="flex gap-2">
                  {[["rgba(0,0,0,0)", "Transparent"], ["rgba(0,0,0,0.6)", "Glass Box"]].map(([bg, label]) => (
                    <button key={label} onClick={() => setSubStyle((s) => ({ ...s, background: bg }))}
                      className={`flex-1 py-2.5 rounded-[1.5rem] border transition-all text-[8px] font-black uppercase tracking-widest
                        ${subStyle.background === bg ? "bg-amber-500 border-amber-500 text-void font-bold shadow-lg shadow-amber-500/20"
                                                     : "bg-white/5 border-white/5 text-white/40 hover:text-white"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {videoError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-void/90 backdrop-blur-xl gap-5 text-center">
          <div className="w-14 h-14 rounded-3xl bg-danger/10 flex items-center justify-center border border-danger/20">
            <ExclamationIcon className="w-7 h-7 text-danger" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-text">
              Playback Error
            </h3>
            <p className="text-sm text-muted mt-1 px-8 max-w-sm">
              Could not load this video source.
            </p>
            {typeof videoError === "string" && (
              <div className="mt-4 p-2 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-300 max-w-md text-left leading-relaxed">
                {videoError}
              </div>
            )}
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

      {/* HLS quality indicator */}
      {hlsQualityEnabled && hlsQuality && sourceType === "hls" && (
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-[2rem] bg-black/50 backdrop-blur-sm text-[10px] font-mono font-bold text-white/70 border border-white/10 pointer-events-none z-20">
          {hlsQuality.level && <span>{hlsQuality.level}</span>}
          {hlsQuality.level && hlsQuality.bitrate && <span className="text-white/30 mx-1">·</span>}
          {hlsQuality.bitrate && <span className="text-white/50">{hlsQuality.bitrate}</span>}
        </div>
      )}

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

            <div
              className="flex items-center bg-white/5 border border-white/10 rounded-[2rem] p-1 transition-all duration-500 ease-in-out gap-1 overflow-hidden"
              style={{
                minWidth: ccMenuOpen ? (isHost ? "152px" : "90px") : "42px",
                maxWidth: ccMenuOpen ? "500px" : "42px",
              }}
            >
              <button
                onClick={() => {
                  if (!ccMenuOpen) setCcMenuOpen(true);
                  else if (subtitleUrl) setShowSubtitles((s) => !s);
                }}
                aria-label="Subtitle Menu"
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all shrink-0
                  ${
                    !subtitleUrl
                      ? "text-white/40 hover:text-white hover:bg-white/10"
                      : showSubtitles
                        ? "bg-amber-500 text-void shadow-lg shadow-amber-500/20"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                  }`}
              >
                <CcIcon className="w-4 h-4" />
              </button>

              {ccMenuOpen && (
                <div className="flex items-center gap-1 animate-in slide-in-from-left-2 fade-in duration-300">
                  <div className="w-[1px] h-4 bg-white/10 mx-0.5" />
                  {isHost && (
                    <button
                      onClick={() => setActivePanel("search")}
                      title="Search Subtitles"
                      className={`w-8 h-8 flex items-center justify-center rounded-full transition-all hover:bg-white/10
                        ${activePanel === "search" ? "text-amber-500" : "text-white/60 hover:text-white"}`}
                    >
                      <SearchIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setActivePanel("recent")}
                    title="Recent Subtitles"
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-all hover:bg-white/10
                      ${activePanel === "recent" ? "text-amber-500" : "text-white/60 hover:text-white"}`}
                  >
                    {/* History/clock icon */}
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => setActivePanel("settings")}
                    title="Subtitle Settings"
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-all hover:bg-white/10
                      ${activePanel === "settings" ? "text-amber-500" : "text-white/60 hover:text-white"}`}
                  >
                    <SettingsIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  if (ccMenuOpen) setActivePanel(null);
                  setCcMenuOpen(!ccMenuOpen);
                }}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all text-white/30 hover:text-white shrink-0 ${ccMenuOpen ? "rotate-180" : ""}`}
              >
                <svg
                  className="w-3 h-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            </div>

            {canControl && (
              <SpeedPicker value={playbackRate} onChange={handleSpeedChange} />
            )}

            {/* Picture-in-Picture */}
            {canPip && (
              <button
                onClick={handlePip}
                aria-label={isPip ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
                title="Picture-in-Picture"
                className={`w-9 h-9 flex items-center justify-center rounded-[2rem] border border-white/8 text-white transition-all active:scale-90 backdrop-blur-sm
                  ${isPip ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-white/8 hover:bg-white/18"}`}
              >
                {/* PiP icon inline to avoid import issues */}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <rect x="12" y="11" width="8" height="6" rx="1" fill="currentColor" stroke="none"/>
                </svg>
              </button>
            )}

            {/* Screenshot to chat */}
            {screenshotEnabled && onSendScreenshot && (
              <button
                onClick={handleScreenshot}
                aria-label="Screenshot to chat"
                title="Send screenshot to chat"
                className="w-9 h-9 flex items-center justify-center rounded-[2rem] bg-white/8 hover:bg-white/18 border border-white/8 text-white transition-all active:scale-90 backdrop-blur-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </button>
            )}

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

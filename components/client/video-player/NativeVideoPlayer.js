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
  onAmbiColors,
  screenshotEnabled = true,
  hlsQualityEnabled = true,
  onSendScreenshot,
  addToast,
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
  const [hlsQuality, setHlsQuality] = useState(null);
  const [recentSubs, setRecentSubs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("wt_recentSubs") || "[]"); } catch { return []; }
  });

  const [subStyle, setSubStyle] = useState({
    fontSize: 100, color: "#ffffff", background: "rgba(0,0,0,0)",
  });

  const containerRef = useRef(null);
  const hideTimer    = useRef(null);
  const seekingRef   = useRef(false);
  const hlsRef       = useRef(null);
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

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const level = hls.levels[data.level];
        if (level) {
          const h = level.height ? `${level.height}p` : "";
          const bps = level.bitrate ? `${(level.bitrate / 1000).toFixed(0)} kbps` : "";
          setHlsQuality(h || bps ? { level: h, bitrate: bps } : null);
        }
      });

      hls.on(Hls.Events.ERROR, (_, d) => {
        if (d.fatal) setVideoError({
          title: "Stream Error",
          detail: `HLS stream failed: ${d.details || d.type || "Fatal connection error"}.`,
        });
      });
    })();
    return () => { hls?.destroy(); hlsRef.current = null; setHlsQuality(null); };
  }, [videoUrl, sourceType, videoRef]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (Math.abs(v.playbackRate - playbackRate) > 0.01) v.playbackRate = playbackRate;
  }, [playbackRate, videoRef]);

  useEffect(() => {
    const v = videoRef.current;
    if (typeof document !== "undefined") setCanPip(!!document.pictureInPictureEnabled);
    if (!v) return;
    const onEnterPip  = () => setIsPip(true);
    const onLeavePip  = () => setIsPip(false);
    v.addEventListener("enterpictureinpicture",  onEnterPip);
    v.addEventListener("leavepictureinpicture",  onLeavePip);
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
      const res = await fetch(`/api/subtitles/search?q=${encodeURIComponent(searchQuery.trim())}&url=${encodeURIComponent(videoUrl)}`);
      const data = await res.json();
      if (data.subtitles) setSubOptions(data.subtitles);
      else setSearchStatus(data.error || "No results found.");
    } catch {
      setSearchStatus("Connection failed.");
    } finally {
      setSearching(false);
    }
  }

  function handleSelectSub(sub) {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const finalSubUrl = `${baseUrl}/api/subtitles/download?url=${encodeURIComponent(sub.url)}`;
    onSubtitleChange?.(finalSubUrl);
    const updated = [{ label: sub.label, url: finalSubUrl }, ...recentSubs.filter(s => s.url !== finalSubUrl)].slice(0, 5);
    setRecentSubs(updated);
    try { localStorage.setItem("wt_recentSubs", JSON.stringify(updated)); } catch {}
    setActivePanel(null);
    setSubOptions(null);
    setSearchQuery("");
  }

  useEffect(() => {
    const styleId = "sub-style-engine";
    let el = document.getElementById(styleId);
    if (!el) {
      el = document.createElement("style"); el.id = styleId; document.head.appendChild(el);
    }
    el.innerHTML = `video::cue { background: ${subStyle.background} !important; color: ${subStyle.color} !important; font-size: ${subStyle.fontSize}% !important; text-shadow: 0 0 4px rgba(0,0,0,0.8); }`;
  }, [subStyle]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (sourceType === "mp4" && v.src !== videoUrl) v.src = videoUrl;
    const onTime = () => { if (!seekingRef.current) setLocalTime(v.currentTime); };
    const onMeta = () => { setDuration(v.duration); setVideoError(false); setPosterVisible(false); };
    const onWait = () => setBuffering(true);
    const onCan = () => setBuffering(false);
    const onErr = () => {
      if (!v.error) { setVideoError({ title: "Playback Error", detail: "Format not supported." }); return; }
      let title = "Playback Error", detail = "";
      switch (v.error.code) {
        case 1: title = "Cancelled"; break;
        case 2: title = "Network Error"; break;
        case 3: title = "Decoding Error"; break;
        case 4: title = "Format Not Supported"; break;
      }
      setVideoError({ title, detail: v.error.message || "Please check the source URL." });
    };
    const onProg = () => {
      if (v.buffered && v.buffered.length > 0) {
        setBufferedPct(v.duration > 0 ? (v.buffered.end(v.buffered.length - 1) / v.duration) * 100 : 0);
      }
    };
    const onFS = () => setFullscreen(Boolean(document.fullscreenElement));
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("waiting", onWait);
    v.addEventListener("canplay", onCan);
    v.addEventListener("error", onErr);
    v.addEventListener("progress", onProg);
    v.addEventListener("ended", () => onPause?.(v.duration));
    document.addEventListener("fullscreenchange", onFS);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("waiting", onWait);
      v.removeEventListener("canplay", onCan);
      v.removeEventListener("error", onErr);
      v.removeEventListener("progress", onProg);
      document.removeEventListener("fullscreenchange", onFS);
    };
  }, [videoRef, videoUrl, sourceType]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }, [volume, muted]);

  useEffect(() => {
    setPosterVisible(true);
    ambiDisabledRef.current = false;
  }, [videoUrl]);

  useEffect(() => {
    if (!onAmbiColors) return;
    const v = videoRef.current; if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = 8; canvas.height = 8;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let lastTime = 0;
    function sample(now) {
      ambiRafRef.current = requestAnimationFrame(sample);
      if (now - lastTime < 80 || ambiDisabledRef.current || v.paused || v.readyState < 2) return;
      lastTime = now;
      try {
        ctx.drawImage(v, 0, 0, 8, 8);
        const p = ctx.getImageData(0, 0, 8, 8).data;
        let r=0, g=0, b=0;
        for (let i=0; i<p.length; i+=4) { r+=p[i]; g+=p[i+1]; b+=p[i+2]; }
        const count = p.length/4;
        const cur = ambiCurrentRef.current;
        const sr = cur.r + (r/count - cur.r) * 0.08;
        const sg = cur.g + (g/count - cur.g) * 0.08;
        const sb = cur.b + (b/count - cur.b) * 0.08;
        ambiCurrentRef.current = { r: sr, g: sg, b: sb };
        onAmbiColors({ r: Math.round(sr), g: Math.round(sg), b: Math.round(sb) });
      } catch (e) { if (e.name === "SecurityError") { ambiDisabledRef.current = true; onAmbiColors(null); } }
    }
    ambiRafRef.current = requestAnimationFrame(sample);
    return () => { cancelAnimationFrame(ambiRafRef.current); onAmbiColors?.(null); };
  }, [videoRef, videoUrl, onAmbiColors]);

  function handlePlayPause() {
    if (!canControl || !videoRef.current) return;
    if (isPlaying) { videoRef.current.pause(); onPause?.(videoRef.current.currentTime); }
    else { videoRef.current.play().catch(()=>{}); onPlay?.(videoRef.current.currentTime); }
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

  function handleFullscreen() {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  }

  function handleRetry() { setVideoError(false); videoRef.current?.load(); }

  async function handlePip() {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (document.pictureInPictureEnabled) await videoRef.current?.requestPictureInPicture();
    } catch {}
  }

  function handleScreenshot() {
    const v = videoRef.current; if (!v || !onSendScreenshot) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(v.videoWidth, 1280);
      canvas.height = Math.round(v.videoHeight * (canvas.width / v.videoWidth));
      canvas.getContext("2d").drawImage(v, 0, 0, canvas.width, canvas.height);
      onSendScreenshot(canvas.toDataURL("image/jpeg", 0.75));
      addToast?.("Screenshot sent!", "success");
    } catch { addToast?.("Screenshot blocked (CORS).", "error"); }
  }

  useVideoHotkeys({ videoRef, handlePlayPause, handleFullscreen, onSeek, setMuted });

  const progressPct = duration > 0 ? (localTime / duration) * 100 : 0;

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black select-none" onMouseMove={showCtrl} onTouchStart={showCtrl}>
      <video ref={videoRef} className="w-full h-full object-contain" playsInline crossOrigin="anonymous" onClick={handlePlayPause} onDoubleClick={handleFullscreen}>
        {subtitleUrl && showSubtitles && <track kind="subtitles" src={subtitleUrl} srcLang="en" label="English" default />}
      </video>

      <ThumbnailPoster visible={posterVisible && !videoError} subtitle="Ready to Sync" />
      {buffering && !videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="w-14 h-14 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
        </div>
      )}

      {/* Subtitle Panel */}
      <div className={`absolute bottom-24 right-6 w-full max-w-[420px] h-[540px] bg-black/30 backdrop-blur-2xl border border-white/10 z-50 transition-all duration-200 shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col ${activePanel ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className="p-5 pb-1">
          <div className="flex items-center justify-between mb-5 px-1">
            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.25em]">Subtitles</h3>
            <button onClick={() => setActivePanel(null)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 text-white/20 hover:text-white transition-colors">✕</button>
          </div>
          <div className="bg-white/5 p-1 rounded-2xl flex relative border border-white/5">
            <div className="absolute top-1 bottom-1 bg-white/10 rounded-xl transition-all duration-200" style={{ left: activePanel === "search" ? "4px" : activePanel === "recent" ? "calc(33.33% + 2px)" : "calc(66.66% + 2px)", width: "calc(33.33% - 6px)" }} />
            {["search", "recent", "settings"].map(tab => (
              <button key={tab} onClick={() => setActivePanel(tab)} className={`flex-1 relative z-10 py-2 text-[8px] font-black uppercase tracking-[0.2em] transition-all ${activePanel === tab ? "text-white" : "text-white/30 hover:text-white/60"}`}>
                {tab === "search" ? "Search" : tab === "recent" ? "Recent" : "Styles"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pt-3 custom-scrollbar">
          {activePanel === "search" && (
            <div className="space-y-4">
              <form onSubmit={handleSearchSubs} className="relative">
                <input autoFocus type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Find a track..." className="w-full bg-white/5 border border-white/10 rounded-[2rem] px-5 py-2.5 text-xs text-white placeholder:text-white/20 focus:border-amber-500/40 outline-none transition-all" />
                <button disabled={searching || !searchQuery.trim()} type="submit" className="absolute right-1 top-1 bottom-1 w-8 rounded-full bg-amber-500 text-void transition-all disabled:opacity-30 active:scale-95">
                  {searching ? <div className="w-3 h-3 border-2 border-void/30 border-t-void rounded-full animate-spin mx-auto" /> : <SearchIcon className="w-3 h-3 mx-auto" />}
                </button>
              </form>
              {searchStatus && !subOptions && <div className="text-center py-12 opacity-40 text-[10px] uppercase font-bold tracking-widest leading-relaxed">{searchStatus}</div>}
              {subOptions && (
                <div className="space-y-1">
                  {subOptions.length === 0 ? <div className="text-center py-12 opacity-20 text-[9px] uppercase font-bold tracking-widest">No Results</div> : subOptions.map(sub => (
                    <button key={sub.id} onClick={() => handleSelectSub(sub)} className={`w-full text-left px-4 py-2.5 rounded-[1.5rem] transition-all border flex items-center justify-between group ${subtitleUrl && subtitleUrl.includes(sub.url) ? "bg-amber-500/10 border-amber-500/30 text-amber-500 font-bold" : "bg-white/5 border-transparent hover:border-white/10 text-white/40 hover:text-white/80"}`}>
                      <span className="text-[11px] truncate pr-3">{sub.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activePanel === "recent" && (
            <div className="space-y-1">
              {recentSubs.length === 0 ? <div className="text-center py-16 opacity-20 text-[9px] uppercase font-bold tracking-widest leading-loose">No recent subtitles.</div> : recentSubs.map(sub => (
                <div key={sub.url} className="flex items-center gap-1.5 group/sub">
                  <button onClick={() => { onSubtitleChange?.(sub.url); setActivePanel(null); }} className={`flex-1 text-left px-4 py-2.5 rounded-[1.5rem] transition-all border flex items-center justify-between ${subtitleUrl === sub.url ? "bg-amber-500/10 border-amber-500/30 text-amber-500 font-bold" : "bg-white/5 border-transparent hover:border-white/10 text-white/40 hover:text-white/80"}`}>
                    <span className="text-[11px] truncate pr-3">{sub.label}</span>
                  </button>
                  <button onClick={() => { const u = recentSubs.filter(s => s.url !== sub.url); setRecentSubs(u); localStorage.setItem("wt_recentSubs", JSON.stringify(u)); }} className="opacity-0 group-hover/sub:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-full bg-danger/10 text-danger/60 hover:text-danger text-xs">✕</button>
                </div>
              ))}
            </div>
          )}

          {activePanel === "settings" && (
            <div className="space-y-6">
              <section>
                <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2.5 block ml-1">Scale</label>
                <div className="grid grid-cols-4 gap-2">
                  {[50, 75, 100, 125].map(sz => (
                    <button key={sz} onClick={() => setSubStyle(s => ({ ...s, fontSize: sz }))} className={`py-2 rounded-[1.25rem] border text-[9px] font-bold transition-all ${subStyle.fontSize === sz ? "bg-amber-500 border-amber-500 text-void" : "bg-white/5 border-white/5 text-white/40 hover:text-white"}`}>{sz}%</button>
                  ))}
                </div>
              </section>
              <section>
                <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2.5 block ml-1">Color</label>
                <div className="bg-white/5 p-2 rounded-[1.5rem] flex items-center justify-between">
                  {["#ffffff","#ffee00","#00ffcc","#ff3366","#ff9900"].map(c => (
                    <button key={c} onClick={() => setSubStyle(s => ({ ...s, color: c }))} className={`w-6 h-6 rounded-full border-2 transition-all ${subStyle.color === c ? "border-amber-500" : "border-transparent opacity-40 hover:opacity-100"}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </section>
              <section>
                <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2.5 block ml-1">Modes</label>
                <div className="flex gap-2">
                  {[["rgba(0,0,0,0)", "Transparent"], ["rgba(0,0,0,0.6)", "Glass Box"]].map(([bg, label]) => (
                    <button key={label} onClick={() => setSubStyle(s => ({ ...s, background: bg }))} className={`flex-1 py-2 rounded-[1.5rem] border text-[8px] font-black uppercase tracking-widest ${subStyle.background === bg ? "bg-amber-500 border-amber-500 text-void" : "bg-white/5 border-white/5 text-white/40"}`}>{label}</button>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {videoError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-void/92 backdrop-blur-xl gap-5 text-center px-6 z-30">
          <div className="w-14 h-14 rounded-[2rem] bg-danger/10 flex items-center justify-center border border-danger/20 shrink-0"><ExclamationIcon className="w-7 h-7 text-danger" /></div>
          <div className="max-w-sm w-full">
            <h3 className="font-display font-bold text-lg text-white/90">{videoError.title}</h3>
            <p className="text-sm text-white/50 mt-2 leading-relaxed">{videoError.detail}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleRetry} className="h-10 px-6 rounded-[2rem] bg-amber-500 text-void font-black text-xs uppercase tracking-widest hover:bg-amber-400 transition-all">Try Again</button>
            <button onClick={() => setVideoError(false)} className="h-10 px-5 rounded-[2rem] glass-card text-white/50 hover:text-white text-xs font-bold transition-all">Dismiss</button>
          </div>
        </div>
      )}

      {chatOverlay}

      {/* Controls */}
      <div className={`absolute inset-x-0 bottom-0 z-20 transition-all duration-400 ${ctrlVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
        <div className="relative px-4 pb-4 pt-8 space-y-2">
          {/* Seek bar */}
          <div className="relative h-1.5 bg-white/15 rounded-full hover:h-2 transition-all cursor-pointer overflow-hidden group/seek">
            <div className="absolute inset-y-0 left-0 bg-white/20" style={{ width: `${bufferedPct}%` }} />
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-600 to-amber-400 rounded-full" style={{ width: `${progressPct}%` }} />
            <input type="range" min={0} max={duration || 100} step={0.1} value={localTime} onChange={handleSeekChange} onMouseUp={handleSeekCommit} onTouchEnd={handleSeekCommit} className="absolute inset-0 w-full opacity-0 cursor-pointer py-3" />
          </div>

          <div className="flex items-center gap-2.5">
            <button onClick={handlePlayPause} disabled={!canControl} className={`w-11 h-11 flex items-center justify-center rounded-[2rem] border border-white/8 transition-all ${canControl ? "bg-white/8 hover:bg-white/18" : "opacity-30 cursor-not-allowed"}`}>
              {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 ml-0.5" />}
            </button>

            <div className="flex items-center group/vol">
              <button onClick={() => setMuted(m => !m)} className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white">{muted || volume === 0 ? <MuteIcon className="w-4 h-4" /> : <VolumeIcon className="w-4 h-4" />}</button>
              <div className="w-0 group-hover/vol:w-20 transition-all overflow-hidden h-9 flex items-center">
                <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={handleVolumeChange} className="w-18 h-1.5 ml-2 accent-amber-500" />
              </div>
            </div>

            <span className="text-[11px] font-mono text-white/80 tabular-nums bg-white/5 px-2.5 py-1 rounded-[2rem]">
              {formatTime(localTime)} / {formatTime(duration)}
            </span>

            {hlsQualityEnabled && hlsQuality && <span className="hidden sm:inline px-2 py-1 rounded-[2rem] bg-jade/10 border border-jade/20 text-[9px] font-mono font-bold text-jade/70">{hlsQuality.level}</span>}

            <div className="flex-1" />

            <div className="flex items-center bg-white/5 border border-white/10 rounded-[2rem] p-1 gap-1" style={{ minWidth: ccMenuOpen ? "152px" : "42px" }}>
              <button onClick={() => { if (!ccMenuOpen) setCcMenuOpen(true); else if (subtitleUrl) setShowSubtitles(s => !s); }} className={`w-8 h-8 flex items-center justify-center rounded-full ${showSubtitles ? "bg-amber-500 text-void" : "text-white/60"}`}><CcIcon className="w-4 h-4" /></button>
              {ccMenuOpen && (
                <div className="flex items-center gap-1 animate-in fade-in duration-300">
                  <button onClick={() => setActivePanel("search")} className={`w-8 h-8 flex items-center justify-center rounded-full ${activePanel === "search" ? "text-amber-500" : "text-white/60"}`}><SearchIcon className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setActivePanel("recent")} className={`w-8 h-8 flex items-center justify-center rounded-full ${activePanel === "recent" ? "text-amber-500" : "text-white/60"}`}>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </button>
                  <button onClick={() => setActivePanel("settings")} className={`w-8 h-8 flex items-center justify-center rounded-full ${activePanel === "settings" ? "text-amber-500" : "text-white/60"}`}><SettingsIcon className="w-3.5 h-3.5" /></button>
                </div>
              )}
              <button onClick={() => setCcMenuOpen(!ccMenuOpen)} className={`w-8 h-8 flex items-center justify-center text-white/30 hover:text-white ${ccMenuOpen ? "rotate-180" : ""}`}>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
            </div>

            {canControl && <SpeedPicker value={playbackRate} onChange={onSpeed} />}

            {canPip && (
              <button onClick={handlePip} className={`w-9 h-9 flex items-center justify-center rounded-[2rem] transition-all ${isPip ? "bg-amber-500/20 text-amber-400" : "bg-white/8 hover:bg-white/18 text-white"}`}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><rect x="12" y="11" width="8" height="6" rx="1" fill="currentColor" stroke="none"/></svg>
              </button>
            )}

            {screenshotEnabled && (
              <button onClick={handleScreenshot} className="w-9 h-9 flex items-center justify-center rounded-[2rem] bg-white/8 hover:bg-white/18 text-white">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </button>
            )}

            <button onClick={handleFullscreen} className="w-9 h-9 flex items-center justify-center rounded-[2rem] bg-white/8 hover:bg-white/18 text-white">
              {fullscreen ? <CompressIcon className="w-4 h-4" /> : <ExpandIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

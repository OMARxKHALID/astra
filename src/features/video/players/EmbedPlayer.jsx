"use client";

import {
  Monitor as TheatreIcon,
  List as EpisodesIcon,
  Cloud as ServerIcon,
  Play as PlayIcon,
  Pause as PauseIcon,
  Lock as LockIcon,
} from "lucide-react";
import {
  serverOptions,
  detectServer,
} from "@/lib/videoResolver";
import { useState, useRef, useEffect } from "react";

// Extracts { current, duration } from provider-specific postMessage time formats.
function parseTimeMessage(data) {
  if (!data || typeof data !== "object") return null;

  if (
    data.type === "vidlink_time" &&
    data.time != null &&
    data.duration != null
  ) {
    return { current: data.time, duration: data.duration };
  }

  const isTimeEvent =
    data.event === "timeupdate" ||
    data.type === "timeupdate" ||
    data.event === "progress" ||
    data.type === "progress";

  if (isTimeEvent) {
    const current =
      data.currentTime ?? data.time ?? data.seconds ?? data.position;
    const duration = data.duration ?? data.total ?? data.length;
    if (current != null && duration != null && duration > 0) {
      return { current: Number(current), duration: Number(duration) };
    }
  }

  return null;
}

export default function EmbedPlayer({
  videoUrl,
  theatreMode,
  onToggleTheatre,
  hasEpisodes = false,
  onToggleEpisodes,
  onServerChange,
  onLoad,
  isHost = true,
  canControl = true,
  isPlaying,
  onPlay,
  onPause,
}) {
  const containerRef = useRef(null);
  const [showServers, setShowServers] = useState(false);
  const [lastSyncTs, setLastSyncTs] = useState(0);

  const toggleSync = () => {
    if (!canControl) return;
    if (isPlaying) onPause?.(0);
    else onPlay?.(0);
  };

  useEffect(() => {
    const handleMessage = (e) => {
      const data = e.data;
      const parsed = parseTimeMessage(data);
      if (parsed && typeof onLoad === "function") {
        onLoad(videoUrl, null, parsed.duration);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [videoUrl, onLoad]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {});
    ro.observe(containerRef.current);

    const iframe = containerRef.current.querySelector("iframe");
    if (iframe?.contentWindow) {
      if (isPlaying) {
        iframe.contentWindow.postMessage({ type: "vidlink_play" }, "*");
        iframe.contentWindow.postMessage({ event: "command", func: "playVideo", args: [] }, "*");
        iframe.contentWindow.postMessage("play", "*");
      } else {
        iframe.contentWindow.postMessage({ type: "vidlink_pause" }, "*");
        iframe.contentWindow.postMessage({ event: "command", func: "pauseVideo", args: [] }, "*");
        iframe.contentWindow.postMessage("pause", "*");
      }
    }

    return () => ro.disconnect();
  }, [isPlaying]);

  const activeServer = detectServer(videoUrl);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-void flex flex-col group/embed overflow-hidden transition-all duration-700"
    >
      <div className="flex-1 relative" onClick={() => setShowServers(false)}>
        {isPlaying ? (
          <iframe
            key={videoUrl}
            src={videoUrl}
            className="absolute inset-0 w-full h-full pointer-events-auto transition-opacity duration-1000 animate-in fade-in"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
            referrerPolicy="no-referrer-when-downgrade"
            title="Embedded video player"
          />
        ) : (
          /* 1. MINIMAL PAUSED OVERLAY */
          <div className="absolute inset-0 z-[15] bg-void/90 backdrop-blur-3xl flex flex-col items-center justify-center animate-in fade-in duration-1000">
            <div className="relative group/lock cursor-default">
              <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center backdrop-blur-3xl shadow-2xl relative overflow-hidden transition-all duration-700 group-hover/lock:border-amber/20 group-hover/lock:bg-white/[0.04]">
                <div className="absolute inset-0 bg-gradient-to-tr from-amber/5 via-transparent to-transparent opacity-0 group-hover/lock:opacity-100 transition-opacity duration-700" />
                <LockIcon className="w-8 h-8 text-white/10 group-hover/lock:text-amber/40 transition-all duration-700" strokeWidth={1} />
              </div>
              <div className="absolute -inset-4 rounded-full border border-amber/5 animate-pulse opacity-10" />
            </div>

            <div className="flex flex-col items-center mt-10 space-y-2 text-center select-none">
              <p className="text-[10px] font-mono uppercase tracking-[0.8em] font-black text-white/20 group-hover/lock:text-amber/50 transition-all duration-700">
                Room Paused
              </p>
              <p className="text-[9px] font-mono text-white/[0.08] uppercase tracking-[0.3em]">
                Awaiting host resumption
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. MINIMAL SYNC HUB (Host Only) */}
      {isHost && (
        <div className="absolute top-6 left-6 z-[30] transition-all duration-500 translate-y-2 opacity-0 group-hover/embed:translate-y-0 group-hover/embed:opacity-100 pointer-events-none group-hover/embed:pointer-events-auto">
          <div className="flex items-center gap-3 px-1.5 py-1.5 rounded-[var(--radius-pill)] bg-white/[0.03] backdrop-blur-3xl border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.4)] hover:bg-white/[0.05] transition-colors duration-500">
            <button
              onClick={toggleSync}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-90 ${
                isPlaying 
                  ? "bg-danger/20 text-danger/80 border border-danger/20 hover:bg-danger/30 hover:text-danger" 
                  : "bg-amber/20 text-amber/80 border border-amber/20 hover:bg-amber/30 hover:text-amber"
              }`}
              title={isPlaying ? "Sync: Stop Room" : "Sync: Play Room"}
            >
              {isPlaying ? (
                <PauseIcon className="w-3.5 h-3.5 fill-current" />
              ) : (
                <PlayIcon className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>
            <div className="flex flex-col pr-4 pl-1 select-none">
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-white/60">
                {isPlaying ? "Live" : "Paused"}
              </span>
              <span className="text-[8px] font-mono text-white/20 uppercase tracking-tighter">
                Control Hub
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. ORIGINAL CONTROLS (Top Right) */}
      <div className="absolute top-4 right-4 z-20 flex gap-2 translate-y-2 opacity-0 group-hover/embed:translate-y-0 group-hover/embed:opacity-100 transition-all duration-500">
        {isHost && onServerChange && (
          <div className="relative group/servers">
            <button
              onClick={() => setShowServers(!showServers)}
              title="Change Source"
              className={`pointer-events-auto p-2.5 rounded-[var(--radius-pill)] border transition-all cursor-pointer backdrop-blur-md shadow-2xl
                ${showServers 
                  ? "bg-amber text-void border-amber shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
                  : "bg-void/80 text-white/40 hover:text-white hover:bg-void border-white/10"}`}
            >
              <ServerIcon className="w-4 h-4" />
            </button>
            {showServers && (
              <div className="absolute top-full right-0 mt-3 w-48 glass-card border border-white/10 p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto overflow-hidden">
                <div className="px-3 py-2 border-b border-white/5 mb-1">
                   <p className="text-[10px] font-mono font-black text-white/30 uppercase tracking-widest">Select Server</p>
                </div>
                {serverOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onServerChange(opt.value);
                      setShowServers(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-[10.5px] font-bold transition-all flex items-center justify-between
                      ${activeServer === opt.value 
                        ? "bg-amber/15 text-white border border-amber/20 ring-1 ring-amber/10" 
                        : "text-white/50 hover:bg-white/10 hover:text-white border border-transparent"}`}
                  >
                    {opt.label}
                    {activeServer === opt.value && <div className="w-1 h-1 rounded-full bg-amber shadow-[0_0_8px_rgba(245,158,11,0.5)]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {isHost && hasEpisodes && onToggleEpisodes && (
          <button
            onClick={() => {
              onToggleEpisodes();
              setShowServers(false);
            }}
            title="Browse Episodes"
            className="pointer-events-auto p-2.5 rounded-[var(--radius-pill)] bg-void/80 text-white/40 hover:text-white hover:bg-void border border-white/10 transition-all cursor-pointer backdrop-blur-md shadow-2xl"
          >
            <EpisodesIcon className="w-4 h-4" />
          </button>
        )}
        {onToggleTheatre && (
          <button
            onClick={() => {
              onToggleTheatre();
              setShowServers(false);
            }}
            title={theatreMode ? "Exit theatre mode" : "Theatre mode"}
            className={`pointer-events-auto p-2.5 rounded-[var(--radius-pill)] border transition-all cursor-pointer backdrop-blur-md shadow-2xl
              ${theatreMode 
                ? "bg-amber text-void border-amber shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
                : "bg-void/80 text-white/40 hover:text-white hover:bg-void border-white/10"}`}
          >
            <TheatreIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import {
  Monitor as TheatreIcon,
  List as EpisodesIcon,
  Cloud as ServerIcon,
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
}) {
  const containerRef = useRef(null);
  const [showServers, setShowServers] = useState(false);

  useEffect(() => {
    const handleMessage = (e) => {
      const data = e.data;
      const parsed = parseTimeMessage(data);
      if (parsed && typeof onLoad === "function") {
        // [Note] Embed providers report duration once ready — we signal back to RoomView
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
    return () => ro.disconnect();
  }, []);

  const activeServer = detectServer(videoUrl);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-void flex flex-col group"
    >
      <div className="flex-1 relative" onClick={() => setShowServers(false)}>
        <iframe
          key={videoUrl}
          src={videoUrl}
          className="absolute inset-0 w-full h-full pointer-events-auto"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
          referrerPolicy="no-referrer-when-downgrade"
          title="Embedded video player"
        />
      </div>

      <div className="absolute top-4 right-4 flex gap-2 transition-opacity z-50 pointer-events-none">
        {isHost && onServerChange && (
          <div className="relative group/servers">
            <button
              onClick={() => setShowServers(!showServers)}
              title="Change Source"
              className={`pointer-events-auto p-2.5 rounded-[var(--radius-pill)] border transition-all cursor-pointer backdrop-blur-md shadow-2xl
                ${showServers 
                  ? "bg-amber text-void border-amber shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
                  : "bg-void/80 text-white/80 hover:text-white hover:bg-void border-white/10"}`}
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
            className="pointer-events-auto p-2.5 rounded-[var(--radius-pill)] bg-void/80 text-white/80 hover:text-white hover:bg-void border border-white/10 transition-all cursor-pointer backdrop-blur-md shadow-2xl"
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
                : "bg-void/80 text-white/80 hover:text-white hover:bg-void border-white/10"}`}
          >
            <TheatreIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

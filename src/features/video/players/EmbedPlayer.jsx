"use client";

import { useEffect, useRef } from "react";
import { Monitor as TheatreIcon, List as EpisodesIcon } from "lucide-react";

// Extracts { current, duration } from provider-specific postMessage time formats.
// vidlink: { type: "vidlink_time", time, duration }
// generic: { event/type: "timeupdate/progress", currentTime/seconds/time, duration/total }
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
  onToggleChat,
  hasEpisodes = false,
  onToggleEpisodes,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const onKD = (e) => {
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        onToggleChat?.();
      }
    };
    window.addEventListener("keydown", onKD);
    return () => window.removeEventListener("keydown", onKD);
  }, [onToggleChat]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {});
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-void flex flex-col group"
    >
      <div className="flex-1 relative">
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

      {onToggleTheatre && (
        <div className="absolute top-4 right-4 flex gap-2 transition-opacity z-50 pointer-events-none">
          <button
            onClick={onToggleTheatre}
            title={theatreMode ? "Exit theatre mode" : "Theatre mode"}
            className={`pointer-events-auto p-2.5 rounded-[var(--radius-pill)] border transition-all cursor-pointer backdrop-blur-md shadow-2xl
              ${theatreMode 
                ? "bg-amber text-void border-amber shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
                : "bg-void/80 text-white/80 hover:text-white hover:bg-void border-white/10"}`}
          >
            <TheatreIcon className="w-4 h-4" />
          </button>
          {hasEpisodes && onToggleEpisodes && (
            <button
              onClick={onToggleEpisodes}
              title="Browse Episodes"
              className="pointer-events-auto p-2.5 rounded-[var(--radius-pill)] bg-void/80 text-white/80 hover:text-white hover:bg-void border border-white/10 transition-all cursor-pointer backdrop-blur-md shadow-2xl"
            >
              <EpisodesIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

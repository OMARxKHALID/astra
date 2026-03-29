"use client";

import { useEffect, useRef } from "react";
import { Monitor as TheatreIcon } from "lucide-react";

export default function EmbedPlayer({
  videoUrl,
  theatreMode,
  onToggleTheatre,
  onToggleChat,
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

  // Attempt to resize the iframe when container size changes
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {});
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black flex flex-col group"
    >
      {/* Iframe */}
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
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
          <button
            onClick={onToggleTheatre}
            className={`pointer-events-auto p-2.5 rounded-[var(--radius-pill)] glass-card transition-all border-none cursor-pointer ${theatreMode ? "text-amber-400 bg-amber-400/10" : "text-white/70 hover:text-white hover:bg-white/10"}`}
          >
            <TheatreIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

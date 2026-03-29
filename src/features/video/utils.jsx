import { useState, useEffect, useRef } from "react";
import { formatTime } from "@/utils/time";

export { formatTime };
export const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function SpeedPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Playback speed"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-pill)] bg-white/8 hover:bg-white/15
                   border border-white/8 text-xs font-bold text-white/80 transition-all
                   active:scale-95 backdrop-blur-sm min-w-[70px] justify-between"
      >
        <span className="text-[9px] text-white/40 uppercase tracking-wide font-normal">
          spd
        </span>
        <span className="tabular-nums">{value}×</span>
      </button>

      {/* [Note] menus aren't pills - rectangular for legibility */}
      {open && (
        <div
          className="absolute bottom-full right-0 mb-1.5 py-1
                        bg-black/60 backdrop-blur-2xl border border-white/15 rounded-xl shadow-2xl
                        z-50 min-w-[80px] overflow-hidden video-controls"
        >
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-xs font-mono tracking-wide transition-colors
                ${
                  s === value
                    ? "bg-amber-500/20 text-amber-400 font-bold"
                    : "text-white/55 hover:bg-white/8 hover:text-white/90"
                }`}
            >
              {s}×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function useVideoHotkeys({
  videoRef,
  handlePlayPause,
  handleFullscreen,
  onSeek,
  setMuted,
  onToggleChat,
}) {
  useEffect(() => {
    const onKD = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(e.target.tagName))
        return;
      if (e.target.isContentEditable) return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          handlePlayPause?.();
          break;
        case "f":
          e.preventDefault();
          handleFullscreen?.();
          break;
        case "m":
          e.preventDefault();
          setMuted?.((m) => !m);
          break;
        case "c":
          e.preventDefault();
          // [Note] Rationale: Bubble event to RoomView to handle portal rendering
          onToggleChat?.();
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          {
            const t = Math.max(0, v.currentTime - 10);
            v.currentTime = t;
            onSeek?.(t);
          }
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          {
            const t = Math.min(v.duration || Infinity, v.currentTime + 10);
            v.currentTime = t;
            onSeek?.(t);
          }
          break;
      }
    };
    window.addEventListener("keydown", onKD);
    return () => window.removeEventListener("keydown", onKD);
  }, [videoRef, handlePlayPause, handleFullscreen, onSeek, setMuted, onToggleChat]);
}

let ytReady = false,
  ytCbs = [];
export function onYTReady(cb) {
  if (ytReady && window.YT?.Player) {
    cb();
    return;
  }
  ytCbs.push(cb);
  if (!document.getElementById("yt-iframe-api")) {
    const t = document.createElement("script");
    t.id = "yt-iframe-api";
    t.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(t);
  }
  window.onYouTubeIframeAPIReady = () => {
    ytReady = true;
    ytCbs.forEach((f) => f());
    ytCbs = [];
  };
}

let vmReady = false,
  vmCbs = [];
export function onVMReady(cb) {
  if (vmReady && window.Vimeo?.Player) {
    cb();
    return;
  }
  vmCbs.push(cb);
  if (!document.getElementById("vimeo-player-api")) {
    const t = document.createElement("script");
    t.id = "vimeo-player-api";
    t.src = "https://player.vimeo.com/api/player.js";
    t.onload = () => {
      vmReady = true;
      vmCbs.forEach((f) => f());
      vmCbs = [];
    };
    document.head.appendChild(t);
  }
}

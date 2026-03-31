export const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

import { useState, useEffect, useRef } from "react";

export default function SpeedPicker({ value, onChange }) {
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
        className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-pill)] bg-white/10 hover:bg-white/10
                   border border-white/10 text-xs font-bold text-white transition-all
                   active:scale-95 backdrop-blur-sm min-w-[70px] justify-between"
      >
        <span className="text-[9px] text-white/50 uppercase tracking-wide font-normal">
          spd
        </span>
        <span className="tabular-nums">{value}×</span>
      </button>

      {/* [Note] menus aren't pills - rectangular for legibility */}
      {open && (
        <div
          className="absolute bottom-full right-0 mb-1.5 py-1
                        bg-void/60 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl
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
                    ? "bg-amber/20 text-amber font-bold"
                    : "text-white/50 hover:bg-white/10 hover:text-white"
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

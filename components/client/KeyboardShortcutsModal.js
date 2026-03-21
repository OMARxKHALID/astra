"use client";
import { useEffect, useRef } from "react";

const SHORTCUTS = [
  { keys: ["Space", "K"], label: "Play / Pause" },
  { keys: ["F"], label: "Toggle fullscreen" },
  { keys: ["M"], label: "Mute / Unmute" },
  { keys: ["←", "J"], label: "Seek back 10s" },
  { keys: ["→", "L"], label: "Seek forward 10s" },
  { keys: ["?"], label: "Show this help" },
];

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape" || e.key === "?") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={ref}
        className="relative z-10 w-full max-w-xs mx-4 glass-card rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/5">
          <h2 className="font-display font-bold text-base text-white/90">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/8 text-white/40 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-4 space-y-2">
          {SHORTCUTS.map(({ keys, label }) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 py-1.5"
            >
              <span className="text-sm text-white/60 font-body">{label}</span>
              <div className="flex items-center gap-1 shrink-0">
                {keys.map((k, i) => (
                  <span key={k}>
                    <kbd className="px-2 py-0.5 rounded-lg bg-white/8 border border-white/12 text-[11px] font-mono text-white/70 shadow-sm">
                      {k}
                    </kbd>
                    {i < keys.length - 1 && (
                      <span className="text-[10px] text-white/25 mx-1">or</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[10px] text-white/25 font-mono text-center pt-2 pb-1">
            Press{" "}
            <kbd className="px-1 py-0.5 rounded bg-white/8 border border-white/12">
              ?
            </kbd>{" "}
            to close
          </p>
        </div>
      </div>
    </div>
  );
}

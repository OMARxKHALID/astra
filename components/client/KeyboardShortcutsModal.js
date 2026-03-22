"use client";
import { useEffect, useRef } from "react";
import { X as XIcon } from "lucide-react";

const SHORTCUTS = [
  { keys: ["Space", "K"], label: "Play / Pause" },
  { keys: ["F"], label: "Toggle fullscreen" },
  { keys: ["T"], label: "Toggle theatre mode" },
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
      if (e.key === "Escape") onClose();
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
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-1.5">
          {SHORTCUTS.map(({ keys, label }) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 py-1"
            >
              <span className="text-sm text-white/55 font-body">{label}</span>
              <div className="flex items-center gap-1 shrink-0">
                {keys.map((k, i) => (
                  <span key={k} className="flex items-center gap-1">
                    <kbd className="px-2 py-0.5 rounded-lg bg-white/8 border border-white/12 text-[11px] font-mono text-white/65 shadow-sm">
                      {k}
                    </kbd>
                    {i < keys.length - 1 && (
                      <span className="text-[10px] text-white/20">or</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[10px] text-white/20 font-mono text-center pt-3 pb-1">
            Press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-white/8 border border-white/12">
              Esc
            </kbd>{" "}
            to close
          </p>
        </div>
      </div>
    </div>
  );
}

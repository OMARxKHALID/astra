"use client";
import { useEffect, useRef } from "react";
import { X as XIcon } from "lucide-react";

import { KEYBOARD_ROWS } from "@/constants/maps";

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Tab" && ref.current) {
        const focusable = ref.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
          e.preventDefault();
          (e.shiftKey ? last : first)?.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-void/60 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="relative z-10 w-full max-w-[600px] glass-card rounded-[var(--radius-panel)] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10 bg-white/[0.02]">
          <div>
            <h2 id="shortcuts-title" className="font-display font-bold text-lg text-white/90">
              Keyboard Shortcuts
            </h2>
            <p className="text-[10px] text-white/50 mt-0.5 uppercase tracking-wider font-mono">
              Control playback like a pro
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close shortcuts"
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-pill)] hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <XIcon className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          <div className="flex flex-col mb-6 w-full max-w-xl mx-auto scale-90 sm:scale-95 origin-top">
            {KEYBOARD_ROWS.map((row, i) => (
              <div
                key={i}
                className="flex justify-center mb-[6px]"
                style={{ paddingLeft: `${i * 18}px` }}
              >
                {row.map((key) => (
                  <Key
                    key={key.k}
                    label={key.k}
                    active={key.active}
                    highlighted={key.highlight}
                  />
                ))}
              </div>
            ))}

            <div className="flex justify-between items-center mt-[2px] px-2 w-full max-w-[500px] mx-auto">
              <div className="w-[100px]" />
              <Key label="Space" active highlighted lg />
              <div className="flex gap-[6px] w-[100px] justify-end">
                <Key label="←" active sm />
                <Key label="→" active sm />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm w-full px-2 border-t border-white/10 pt-5">
            <ShortcutRow keys={["Space"]} action="Play / Pause" />
            <ShortcutRow keys={["K"]} action="Play / Pause" />
            <ShortcutRow keys={["F"]} action="Toggle fullscreen" />
            <ShortcutRow keys={["J"]} action="Seek back 10s" />
            <ShortcutRow keys={["L"]} action="Seek forward 10s" />
            <ShortcutRow keys={["←"]} action="Seek back 10s" />
            <ShortcutRow keys={["→"]} action="Seek forward 10s" />
            <ShortcutRow keys={["M"]} action="Mute / Unmute" />
            <ShortcutRow keys={["T"]} action="Theatre mode" />
            <ShortcutRow keys={["C"]} action="Toggle chat overlay" />
            <ShortcutRow keys={["?"]} action="Show this help" />
            <ShortcutRow keys={["Esc"]} action="Close menu" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Key({ label, active, highlighted, lg, sm }) {
  const isInactive = !active;
  return (
    <div
      className={`
        flex items-center justify-center rounded-xl font-mono text-[13px] mx-[3px] border
        transition-all duration-200 shrink-0
        ${lg ? "w-64" : sm ? "w-11" : "w-11"} h-11
        ${
          isInactive
            ? "bg-transparent border-white/[0.05] text-white/40 font-medium"
            : highlighted
              ? "bg-amber/10 text-amber border-x-amber/20 border-t-amber/20 border-b-amber/40 border-b-[3px] font-bold shadow-[0_4px_16px_rgba(var(--color-amber-rgb), 0.2)]"
              : "bg-white/[0.08] text-white/80 border-x-white/10 border-t-white/10 border-b-white/10 border-b-[3px] font-bold shadow-md"
        }
      `}
    >
      {label}
    </div>
  );
}

function ShortcutRow({ keys, action }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/70 text-[11px] font-body uppercase tracking-wider font-bold">{action}</span>
      <div className="flex gap-[6px] shrink-0">
        {keys.map((k) => (
          <kbd
            key={k}
            className="px-2 py-0.5 rounded-lg bg-white/10 border border-white/10 text-[10px] font-mono font-bold text-white/90 shadow-sm flex items-center justify-center min-w-[24px] uppercase"
          >
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
}

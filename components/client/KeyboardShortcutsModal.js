"use client";
import { useEffect, useRef } from "react";
import { X as XIcon } from "lucide-react";

const KEYBOARD_ROWS = [
  [
    { k: "Q" },
    { k: "W" },
    { k: "E" },
    { k: "R" },
    { k: "T", active: true },
    { k: "Y" },
    { k: "U" },
    { k: "I" },
    { k: "O" },
    { k: "P" },
  ],
  [
    { k: "A" },
    { k: "S" },
    { k: "D" },
    { k: "F", active: true },
    { k: "G" },
    { k: "H" },
    { k: "J", active: true },
    { k: "K", active: true, highlight: true },
    { k: "L", active: true },
  ],
  [
    { k: "Z" },
    { k: "X" },
    { k: "C" },
    { k: "V" },
    { k: "B" },
    { k: "N" },
    { k: "M", active: true },
    { k: "," },
    { k: "." },
    { k: "?", active: true },
  ],
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        ref={ref}
        className="relative z-10 w-full max-w-2xl glass-card rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-white/5 bg-white/[0.02]">
          <div>
            <h2 className="font-display font-bold text-xl text-white/90">
              Keyboard Shortcuts
            </h2>
            <p className="text-[11px] text-white/40 mt-1 uppercase tracking-wider font-mono">
              Control playback like a pro
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <XIcon className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center">
          {/* Visual Keyboard Frame */}
          <div className="flex flex-col mb-10 w-full max-w-xl mx-auto">
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

            {/* Bottom Row */}
            <div className="flex justify-between items-center mt-[2px] px-2 w-full max-w-[500px] mx-auto">
              <div className="w-[100px]" /> {/* Placeholder spacing */}
              <Key label="Space" active highlighted lg />
              <div className="flex gap-[6px] w-[100px] justify-end">
                <Key label="←" active sm />
                <Key label="→" active sm />
              </div>
            </div>
          </div>

          {/* Shortcuts Legend */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 text-sm w-full px-4 border-t border-white/5 pt-8">
            <ShortcutRow keys={["Space"]} action="Play / Pause" />
            <ShortcutRow keys={["K"]} action="Play / Pause" />
            <ShortcutRow keys={["F"]} action="Toggle fullscreen" />
            <ShortcutRow keys={["J"]} action="Seek back 10s" />
            <ShortcutRow keys={["L"]} action="Seek forward 10s" />
            <ShortcutRow keys={["←"]} action="Seek back 10s" />
            <ShortcutRow keys={["→"]} action="Seek forward 10s" />
            <ShortcutRow keys={["M"]} action="Mute / Unmute" />
            <ShortcutRow keys={["T"]} action="Theatre mode" />
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
            ? "bg-transparent border-white/[0.05] text-white/10 font-medium"
            : highlighted
              ? "bg-amber-500/10 text-amber-500 border-x-amber-500/20 border-t-amber-500/20 border-b-amber-500/40 border-b-[3px] font-bold shadow-[0_4px_16px_rgba(245,158,11,0.2)]"
              : "bg-white/[0.08] text-white/90 border-x-white/10 border-t-white/10 border-b-white/20 border-b-[3px] font-bold shadow-md"
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
      <span className="text-white/50 text-[13px] font-body">{action}</span>
      <div className="flex gap-[6px] shrink-0">
        {keys.map((k) => (
          <kbd
            key={k}
            className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-white/70 shadow-sm flex items-center justify-center min-w-[24px]"
          >
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
}

"use client";

import { Lock, Play } from "lucide-react";

/**
 * PausedOverlay: The universal "Room Curtains". 
 * Displayed over players whenever the room is in a PAUSED state 
 * and the Sync Hub is enabled.
 */
export default function PausedOverlay({ canControl, onPlay }) {
  return (
    <div
      onClick={() => canControl && onPlay?.(0)}
      className={`absolute inset-0 z-[15] bg-void/95 backdrop-blur-3xl flex flex-col items-center justify-center animate-in fade-in duration-700 ${
        canControl ? "cursor-pointer group/overlay" : "cursor-default"
      }`}
    >
      <div className="relative group/lock">
        <div
          className={`w-20 h-20 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center backdrop-blur-3xl shadow-2xl relative overflow-hidden transition-all duration-700
          ${canControl ? "group-hover/overlay:border-amber/40 group-hover/overlay:bg-white/[0.06] group-hover/overlay:scale-110" : ""}`}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-amber/5 via-transparent to-transparent opacity-0 group-hover/overlay:opacity-100 transition-opacity duration-700" />
          {canControl ? (
            <>
              <Lock
                className="w-8 h-8 text-white/10 transition-all duration-700 absolute group-hover/overlay:opacity-0 group-hover/overlay:scale-50"
                strokeWidth={1}
              />
              <Play
                className="w-10 h-10 text-amber/0 transition-all duration-700 scale-50 opacity-0 group-hover/overlay:opacity-100 group-hover/overlay:scale-100 group-hover/overlay:text-amber fill-current ml-1"
                strokeWidth={1.5}
              />
            </>
          ) : (
            <Lock className="w-8 h-8 text-white/10" strokeWidth={1} />
          )}
        </div>
        <div className="absolute -inset-4 rounded-full border border-amber/5 animate-pulse opacity-10" />
      </div>

      <div className="flex flex-col items-center mt-10 space-y-2 text-center select-none">
        <p className="text-[10px] font-mono uppercase tracking-[0.8em] font-black text-white/20 group-hover/overlay:text-amber/50 transition-all duration-700">
          Room Paused
        </p>
        <p className="text-[9px] font-mono text-white/[0.08] uppercase tracking-[0.3em] group-hover/overlay:text-white/20 transition-all duration-700">
          {canControl
            ? "Click anywhere to Play"
            : "Awaiting host resumption"}
        </p>
      </div>
    </div>
  );
}

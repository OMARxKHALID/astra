"use client";

import { Play, Pause } from "lucide-react";
import Button from "@/components/ui/Button";

export default function SyncHub({
  isPlaying,
  onPlay,
  onPause,
  visible = true
}) {
  if (!visible) return null;

  return (
    <div
      className={`absolute top-6 left-1/2 -translate-x-1/2 z-[80] transition-all duration-500 rounded-[var(--radius-pill)]
        ${!isPlaying
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-2 opacity-0 group-hover/embed:opacity-100 group-hover/embed:translate-y-0 pointer-events-none group-hover/embed:pointer-events-auto"}
      `}
    >
      <div className="flex items-center gap-3 px-1.5 py-1.5 rounded-[var(--radius-pill)] glass-card !bg-void/80 text-white/40 hover:text-white shadow-2xl transition-all duration-500">
        <Button
          variant="custom"
          onClick={(e) => {
            e.stopPropagation();
            if (isPlaying) onPause?.(0);
            else onPlay?.(0);
          }}
          className={`w-9 h-9 !p-0 !rounded-full transition-all active:scale-90 shadow-lg border-none
            ${isPlaying
              ? "!bg-danger/20 !text-danger/80 hover:!bg-danger/30 hover:!text-danger"
              : "!bg-amber/20 !text-amber/80 hover:!bg-amber/30 hover:!text-amber shadow-amber/10"
            }`}
          title={isPlaying ? "Sync: Stop Room" : "Sync: Play Room"}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </Button>
        
        <div className="flex flex-col pr-4 pl-1 select-none pointer-events-none">
          <span className="text-[9px] font-mono font-black uppercase tracking-widest text-white/60">
            {isPlaying ? "Live" : "Paused"}
          </span>
          <span className="text-[8px] font-mono text-white/20 uppercase tracking-tighter">
            Control Hub
          </span>
        </div>
      </div>
    </div>
  );
}

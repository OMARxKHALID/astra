"use client";

import { Volume2 as VolumeIcon, VolumeX as MuteIcon } from "lucide-react";

/**
 * On-Screen Display (OSD) for volume changes via scroll or keyboard.
 */
export default function VolumeOsd({ value }) {
  if (value === null) return null;

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none animate-in fade-in duration-150">
      <div className="flex flex-col items-center gap-2 px-5 py-3 glass-card min-w-[110px]">
        <div className="text-white/40">
          {value === 0 ? <MuteIcon className="w-5 h-5" /> : <VolumeIcon className="w-5 h-5" />}
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-white transition-all duration-100"
            style={{ width: `${Math.round(value * 100)}%` }}
          />
        </div>
        <span className="text-[11px] font-mono font-bold text-white/40 tabular-nums">
          {Math.round(value * 100)}%
        </span>
      </div>
    </div>
  );
}

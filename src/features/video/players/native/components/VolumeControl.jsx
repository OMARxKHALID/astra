"use client";

import { Volume2 as VolumeIcon, VolumeX as MuteIcon } from "lucide-react";

export default function VolumeControl({
  volume,
  muted,
  onVolumeChange,
  onMuteToggle,
}) {
  return (
    <div className="group/volume relative flex items-center gap-2">
      <button
        onClick={onMuteToggle}
        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white transition-all active:scale-95"
      >
        {muted || volume === 0 ? (
          <MuteIcon className="w-5 h-5 text-danger/80" />
        ) : (
          <VolumeIcon className="w-5 h-5" />
        )}
      </button>

      <div className="w-0 group-hover/volume:w-16 sm:group-hover/volume:w-20 transition-all duration-300 overflow-hidden flex items-center h-8">
        <div className="relative h-1.5 ml-2 bg-white/15 rounded-full cursor-pointer overflow-hidden flex-1">
          <div
            className="absolute inset-y-0 left-0 bg-white/80 rounded-full pointer-events-none"
            style={{ width: `${(muted ? 0 : volume) * 100}%` }}
          />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={onVolumeChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}

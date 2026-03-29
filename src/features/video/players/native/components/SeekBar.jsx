"use client";

import { formatTime } from "../../../utils";

export default function SeekBar({
  localTime,
  duration,
  bufferedPct,
  onSeekChange,
  onSeekCommit,
  preview,
  handleMouseMove,
  handleMouseLeave,
  canControl,
}) {
  const progressPct = duration > 0 ? (localTime / duration) * 100 : 0;

  return (
    <div className="flex-1 group/bar relative h-full flex flex-col justify-center">
      {preview && (
        <div
          className="absolute bottom-full mb-3 -translate-x-1/2 flex flex-col items-center pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: `clamp(80px, ${preview.x}px, calc(100% - 80px))`,
          }}
        >
          <div className="relative glass-card border border-white/15 rounded-xl overflow-hidden shadow-2xl bg-black/40 backdrop-blur-3xl min-w-[120px]">
            {preview.img ? (
              <img
                src={preview.img}
                alt=""
                className="w-40 h-[90px] object-cover"
              />
            ) : (
              <div className="w-40 h-[90px] bg-black/70 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
              </div>
            )}
            <div className="px-3 py-1 bg-black/70 border-t border-white/10 text-center">
              <span className="text-[11px] font-mono font-bold text-white tabular-nums">
                {formatTime(preview.time)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="relative h-1.5 bg-white/15 rounded-full hover:h-2 transition-all duration-150 cursor-pointer overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-white/20"
          style={{ width: `${bufferedPct}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
          style={{ width: `${progressPct}%` }}
        />
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={localTime}
          onChange={onSeekChange}
          onMouseUp={onSeekCommit}
          onTouchEnd={onSeekCommit}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          disabled={!canControl}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
        />
      </div>
    </div>
  );
}

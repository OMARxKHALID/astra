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

  // [Note] onTouchMove synthesizes a seek-change event from the touch X position,
  // enabling real-time seek scrubbing on mobile where mousemove doesn't fire.
  const handleTouchMove = (e) => {
    if (!canControl || !duration) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (touch.clientX - rect.left) / rect.width),
    );
    const syntheticValue = ratio * duration;
    onSeekChange({ target: { value: syntheticValue } });
  };

  const handleTouchEnd = (e) => {
    if (!canControl || !duration) return;
    const touch = e.changedTouches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (touch.clientX - rect.left) / rect.width),
    );
    const syntheticValue = ratio * duration;
    onSeekCommit({ target: { value: syntheticValue } });
  };

  return (
    <div className="flex-1 group/bar relative h-full flex flex-col justify-center">
      {preview && (
        <div
          className="absolute bottom-full mb-3 pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: `clamp(80px, ${preview.x}px, calc(100% - 80px))`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-40 h-[90px] rounded-lg overflow-hidden bg-black/70 border border-white/15 shadow-2xl">
              {preview.img ? (
                <img
                  src={preview.img}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
            <span className="text-[11px] font-mono font-bold text-white bg-black/70 px-2 py-0.5 rounded-full border border-white/10">
              {formatTime(preview.time)}
            </span>
          </div>
        </div>
      )}

      <div
        className="relative h-1.5 bg-white/10 rounded-full hover:h-2 transition-all duration-150 cursor-pointer overflow-hidden"
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "none" }}
      >
        <div
          className="absolute inset-y-0 left-0 bg-white/10"
          style={{ width: `${bufferedPct}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-600 to-amber rounded-full"
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
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          disabled={!canControl}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
          style={{ touchAction: "none" }}
        />
      </div>
    </div>
  );
}

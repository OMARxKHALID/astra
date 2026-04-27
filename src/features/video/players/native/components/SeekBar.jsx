"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { time } from "../../../utils";

export function SeekBar({
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
  const barRef = useRef(null);
  const rectCacheRef = useRef({ width: 1, left: 0 });

  useEffect(() => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    rectCacheRef.current = { width: rect.width, left: rect.left };
    const ro = new ResizeObserver((entries) => {
      rectCacheRef.current = entries[0].contentRect;
    });
    ro.observe(barRef.current);
    return () => ro.disconnect();
  }, []);

  const handleTouchMove = (e) => {
    if (!canControl || !duration) return;
    const touch = e.touches[0];
    const { width, left } = rectCacheRef.current;
    const ratio = Math.max(0, Math.min(1, (touch.clientX - left) / width));
    const syntheticValue = ratio * duration;
    onSeekChange({ target: { value: syntheticValue } });
  };

  const handleTouchEnd = (e) => {
    if (!canControl || !duration) return;
    const touch = e.changedTouches[0];
    const { width, left } = rectCacheRef.current;
    const ratio = Math.max(0, Math.min(1, (touch.clientX - left) / width));
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
                <Image
                  src={preview.img}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="160px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
            <span className="text-[11px] font-mono font-bold text-white bg-black/70 px-2 py-0.5 rounded-full border border-white/10">
              {time(preview.time)}
            </span>
          </div>
        </div>
      )}

      <div
        ref={barRef}
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

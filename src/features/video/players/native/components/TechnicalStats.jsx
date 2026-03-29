"use client";

export default function TechnicalStats({
  visible,
  hlsQuality,
  videoUrl,
  sourceType,
  duration,
  localTime,
  videoRef,
}) {
  if (!visible) return null;

  return (
    <div className="absolute top-16 left-6 p-4 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-[10px] font-mono text-white/50 space-y-2 pointer-events-none z-40">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-amber-500 font-bold uppercase tracking-widest text-[9px]">
          Engine active
        </span>
      </div>
      <div className="space-y-1 opacity-80">
        <p>
          <span className="text-white/30 mr-2">Source:</span>{" "}
          {sourceType.toUpperCase()}
        </p>
        {hlsQuality && (
          <>
            <p>
              <span className="text-white/30 mr-2">Level:</span>{" "}
              {hlsQuality.level}
            </p>
            <p>
              <span className="text-white/30 mr-2">Bitrate:</span>{" "}
              {hlsQuality.bitrate}
            </p>
          </>
        )}
        <p>
          <span className="text-white/30 mr-2">Resolution:</span>{" "}
          {videoRef.current?.videoWidth}x{videoRef.current?.videoHeight}
        </p>
        <p>
          <span className="text-white/30 mr-2">Buffered:</span>{" "}
          {Math.round(localTime)}s / {Math.round(duration)}s
        </p>
        <p className="max-w-[200px] truncate">
          <span className="text-white/30 mr-2">Provider:</span> {videoUrl}
        </p>
      </div>
    </div>
  );
}

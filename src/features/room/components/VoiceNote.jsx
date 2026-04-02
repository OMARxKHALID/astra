import { useState, useRef } from "react";
import { Play as PlayIcon, Pause as PauseIcon } from "lucide-react";

export function VoiceNote({ src, isOwn }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  };

  const handleTimeUpdate = () => {
    const aud = audioRef.current;
    if (!aud) return;
    setCurrentTime(aud.currentTime);
    if (aud.duration && aud.duration !== Infinity) {
      setProgress(aud.currentTime / aud.duration);
    }
  };

  const handleLoadedMetadata = () => {
    const aud = audioRef.current;
    if (aud && aud.duration && aud.duration !== Infinity) {
      setDuration(aud.duration);
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const aud = audioRef.current;
    if (aud && aud.duration && aud.duration !== Infinity) {
      aud.currentTime = pos * aud.duration;
      setProgress(pos);
    }
  };

  const formatTime = (t) => {
    if (!t || isNaN(t) || t === Infinity) return "0:00";
    return `${Math.floor(t / 60)}:${Math.floor(t % 60)
      .toString()
      .padStart(2, "0")}`;
  };

  // [Note] Show current time while playing, total duration when idle — mirrors native voice note UX
  const displayTime = isPlaying || currentTime > 0 ? currentTime : duration;

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-1.5 w-[160px] h-[32px] rounded-full shadow-sm border ${
        isOwn
          ? "bg-amber border-amber/20 text-void"
          : "bg-surface border-white/10 text-white/80"
      }`}
    >
      <button
        onClick={togglePlay}
        className={`shrink-0 flex items-center justify-center w-5 h-5 rounded-full transition-transform active:scale-90 ${
          isOwn ? "bg-void/10 text-void" : "bg-white/10 text-white"
        }`}
      >
        {isPlaying ? (
          <PauseIcon className="w-2.5 h-2.5 fill-current" />
        ) : (
          <PlayIcon className="w-2.5 h-2.5 fill-current ml-0.5" />
        )}
      </button>

      <div
        className={`flex-1 h-1.5 rounded-full overflow-hidden relative cursor-pointer ${
          isOwn ? "bg-void/20" : "bg-white/10"
        }`}
        onClick={handleSeek}
      >
        <div
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-75 ease-linear ${
            isOwn ? "bg-void/60" : "bg-amber"
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <span className="text-[9px] font-mono tracking-wide shrink-0 font-medium">
        {formatTime(displayTime)}
      </span>

      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          setProgress(0);
          setCurrentTime(0);
          if (audioRef.current) audioRef.current.currentTime = 0;
        }}
      />
    </div>
  );
}

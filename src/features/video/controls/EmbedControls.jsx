"use client";

import { useState } from "react";
import { formatTime, SpeedPicker } from "../utils";
import {
  Play as PlayIcon,
  Pause as PauseIcon,
  Volume2 as VolumeIcon,
  VolumeX as MuteIcon,
  Lock as LockSmallIcon,
  Captions as CcIcon,
  Maximize as ExpandIcon,
  Minimize as CompressIcon,
} from "lucide-react";

// [Note] Theatre icon inlined to avoid circular dependencies
function TheatreIconInline({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export default function EmbedControls({
  visible,
  isPlaying,
  localTime,
  duration,
  progressPct,
  bufferedPct = 0,
  playbackRate,
  onPlayPause,
  onSeekCommit,
  onSpeedChange,
  showSpeed,
  volume = 1,
  muted = false,
  onVolumeChange,
  onMuteToggle,
  showVolume = false,
  showCc = false,
  ccEnabled = false,
  onCcToggle,
  canControl = true,
  onFullscreen,
  isFullscreen = false,
  theatreMode = false,
  onToggleTheatre,
}) {
  const [tmp, setTmp] = useState(0);
  const [seeking, setSeeking] = useState(false);

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-20 transition-all duration-300
      ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
      <div className="relative px-4 pb-4 pt-8 space-y-2">
        <div className="relative h-1.5 bg-white/15 rounded-full hover:h-2 transition-all duration-150 cursor-pointer overflow-hidden group/seek">
          <div
            className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-200"
            style={{ width: `${bufferedPct}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-150"
            style={{ width: `${progressPct}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={seeking ? tmp : localTime}
            onChange={(e) => {
              setSeeking(true);
              setTmp(Number(e.target.value));
            }}
            onMouseUp={(e) => {
              setSeeking(false);
              onSeekCommit(e);
            }}
            onTouchEnd={(e) => {
              setSeeking(false);
              onSeekCommit(e);
            }}
            aria-label="Seek"
            className="absolute inset-0 w-full opacity-0 cursor-pointer py-3"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
            disabled={!canControl}
            className={`w-11 h-11 flex items-center justify-center rounded-[var(--radius-pill)] border border-white/8 transition-all active:scale-90 backdrop-blur-sm
              ${canControl ? "bg-white/8 hover:bg-white/18 text-white" : "bg-white/4 text-white/30 cursor-not-allowed"}`}
          >
            {isPlaying ? (
              <PauseIcon className="w-5 h-5" />
            ) : (
              <PlayIcon className="w-5 h-5 ml-0.5" />
            )}
          </button>

          {showVolume && (
            <div className="flex items-center group/vol">
              <button
                onClick={onMuteToggle}
                aria-label={muted ? "Unmute" : "Mute"}
                className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-pill)] text-white/60 hover:text-white transition-colors"
              >
                {muted || volume === 0 ? (
                  <MuteIcon className="w-4 h-4" />
                ) : (
                  <VolumeIcon className="w-4 h-4" />
                )}
              </button>
              <div className="w-0 group-hover/vol:w-20 transition-all duration-300 overflow-hidden flex items-center h-9">
                <div className="relative w-18 h-1.5 ml-2 bg-white/15 rounded-full cursor-pointer overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-white/80 rounded-full pointer-events-none transition-all duration-150"
                    style={{ width: `${(muted ? 0 : volume) * 100}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={onVolumeChange}
                    aria-label="Volume"
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          <span className="text-[11px] font-mono text-white/80 tabular-nums bg-white/5 px-2.5 py-1 rounded-[var(--radius-pill)] border border-white/5">
            {formatTime(localTime)} / {formatTime(duration)}
          </span>

          {!canControl && (
            <span className="text-[9px] font-mono text-amber-400/60 uppercase tracking-wider flex items-center gap-1.5">
              <LockSmallIcon className="w-3 h-3" /> Host only
            </span>
          )}

          <div className="flex-1" />

          {showCc && onCcToggle && (
            <button
              onClick={onCcToggle}
              aria-label="Toggle subtitles"
              className={`w-9 h-9 flex items-center justify-center rounded-[var(--radius-pill)] border transition-all active:scale-90 backdrop-blur-sm
                ${ccEnabled ? "bg-amber-500/20 text-amber-500 border-amber-500/30" : "bg-white/8 hover:bg-white/18 text-white border-white/8"}`}
            >
              <CcIcon className="w-5 h-5" />
            </button>
          )}

          {showSpeed && onSpeedChange && canControl && (
            <SpeedPicker value={playbackRate} onChange={onSpeedChange} />
          )}

          {onToggleTheatre && (
            <button
              onClick={onToggleTheatre}
              aria-label={theatreMode ? "Exit theatre mode" : "Theatre mode"}
              title={theatreMode ? "Exit theatre mode (T)" : "Theatre mode (T)"}
              className={`w-9 h-9 flex items-center justify-center rounded-[var(--radius-pill)] border transition-all active:scale-90 backdrop-blur-sm
                ${
                  theatreMode
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : "bg-white/8 hover:bg-white/18 text-white border-white/8"
                }`}
            >
              <TheatreIconInline className="w-4 h-4" />
            </button>
          )}

          {onFullscreen && (
            <button
              onClick={onFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-pill)] bg-white/8 hover:bg-white/18 border border-white/8 text-white transition-all active:scale-90 backdrop-blur-sm"
            >
              {isFullscreen ? (
                <CompressIcon className="w-4 h-4" />
              ) : (
                <ExpandIcon className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

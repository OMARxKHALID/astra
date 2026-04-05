"use client";

import { useState } from "react";
import { formatTime } from "../utils";
import SpeedPicker from "./SpeedPicker";
import {
  Play as PlayIcon,
  Pause as PauseIcon,
  Volume2 as VolumeIcon,
  VolumeX as MuteIcon,
  Lock as LockSmallIcon,
  Captions as CcIcon,
  Maximize as ExpandIcon,
  Minimize as CompressIcon,
  List as EpisodesIcon,
} from "lucide-react";

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
  hasEpisodes = false,
  onToggleEpisodes,
  isHost = true,
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
        <div className="relative h-1.5 bg-white/10 rounded-full hover:h-2 transition-all duration-150 cursor-pointer overflow-hidden group/seek">
          <div
            className="absolute inset-y-0 left-0 bg-white/10 transition-all duration-200"
            style={{ width: `${bufferedPct}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-600 to-amber rounded-full transition-all duration-150"
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

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <button
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
            disabled={!canControl}
            className={`w-9 h-9 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center rounded-[var(--radius-pill)] border border-white/10 transition-all active:scale-90 backdrop-blur-sm
              ${canControl ? "bg-white/10 hover:bg-white/10 text-white" : "bg-white/10 text-white/40 cursor-not-allowed"}`}
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
                className="w-9 h-9 shrink-0 flex items-center justify-center rounded-[var(--radius-pill)] text-white/40 hover:text-white transition-colors"
              >
                {muted || volume === 0 ? (
                  <MuteIcon className="w-4 h-4" />
                ) : (
                  <VolumeIcon className="w-4 h-4" />
                )}
              </button>
              <div className="w-0 group-hover/vol:w-20 transition-all duration-300 overflow-hidden flex items-center h-9">
                <div className="relative w-18 h-1.5 ml-2 bg-white/10 rounded-full cursor-pointer overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-amber rounded-full pointer-events-none transition-all duration-150"
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

          <span className="text-[11px] font-mono shrink-0 text-white/40 tabular-nums bg-white/10 px-2.5 py-1 rounded-[var(--radius-pill)] border border-white/10">
            {formatTime(localTime)} / {formatTime(duration)}
          </span>

          {!canControl && (
            <span className="text-[9px] font-mono text-amber/60 uppercase tracking-wider flex items-center gap-1.5">
              <LockSmallIcon className="w-3 h-3" /> Host only
            </span>
          )}

          <div className="flex-1" />

          {showCc && onCcToggle && (
            <button
              onClick={onCcToggle}
              aria-label="Toggle subtitles"
              className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-[var(--radius-pill)] border transition-all active:scale-90 backdrop-blur-sm
                ${ccEnabled ? "bg-amber/20 text-amber border-amber/30" : "bg-white/10 hover:bg-white/10 text-white border-white/10"}`}
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
              className={`hidden sm:flex w-9 h-9 shrink-0 items-center justify-center rounded-[var(--radius-pill)] border transition-all active:scale-90 backdrop-blur-sm
                ${
                  theatreMode
                    ? "bg-amber/20 text-amber border-amber/30"
                    : "bg-white/10 hover:bg-white/10 text-white border-white/10"
                }`}
            >
              <TheatreIconInline className="w-4 h-4" />
            </button>
          )}

          {isHost && hasEpisodes && onToggleEpisodes && (
            <button
              onClick={onToggleEpisodes}
              title="Episodes"
              className="w-9 h-9 shrink-0 flex items-center justify-center rounded-[var(--radius-pill)] bg-white/10 hover:bg-white/10 border border-white/10 text-white transition-all active:scale-90 backdrop-blur-sm"
            >
              <EpisodesIcon className="w-4 h-4" />
            </button>
          )}

          {onFullscreen && (
            <button
              onClick={onFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="w-9 h-9 shrink-0 flex items-center justify-center rounded-[var(--radius-pill)] bg-white/10 hover:bg-white/10 border border-white/10 text-white transition-all active:scale-90 backdrop-blur-sm"
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

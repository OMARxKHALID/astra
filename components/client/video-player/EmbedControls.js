"use client";

import { useState } from "react";
import {
  formatTime,
  SpeedPicker,
  PlayIcon,
  PauseIcon,
  VolumeIcon,
  MuteIcon,
  LockSmallIcon,
} from "./utils";

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
  canControl = true,
}) {
  const [tmp, setTmp] = useState(0);
  const [seeking, setSeeking] = useState(false);

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-20 transition-all duration-400 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
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
            className={`w-11 h-11 flex items-center justify-center rounded-xl border border-white/8 transition-all active:scale-90 backdrop-blur-sm
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
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white/60 hover:text-white transition-colors"
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
          <span className="text-[11px] font-mono text-white/80 tabular-nums bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
            {formatTime(localTime)} / {formatTime(duration)}
          </span>
          {!canControl && (
            <span className="text-[9px] font-mono text-amber-400/60 uppercase tracking-wider flex items-center gap-1.5">
              <LockSmallIcon className="w-3 h-3" /> Host only
            </span>
          )}
          <div className="flex-1" />
          {showSpeed && onSpeedChange && canControl && (
            <SpeedPicker value={playbackRate} onChange={onSpeedChange} />
          )}
        </div>
      </div>
    </div>
  );
}

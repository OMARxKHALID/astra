"use client";

import {
  Play as PlayIcon,
  Pause as PauseIcon,
  Maximize as ExpandIcon,
  Minimize as CompressIcon,
  Lock as LockSmallIcon,
  Captions as CcIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Camera as CameraIcon,
  PictureInPicture2 as PipIcon,
  Monitor as TheatreIconSvg,
  List as EpisodesIcon,
} from "lucide-react";
import { formatTime } from "../../../utils";
import SpeedPicker from "../../../controls/SpeedPicker";
import SeekBar from "./SeekBar";
import VolumeControl from "./VolumeControl";

export default function ControlBar({
  isPlaying,
  localTime,
  duration,
  bufferedPct,
  onPlayPause,
  onSeekChange,
  onSeekCommit,
  volume,
  muted,
  onVolumeChange,
  onMuteToggle,
  fullscreen,
  onFullscreenToggle,
  canControl,
  playbackRate,
  onSpeedChange,
  hlsQuality,
  hlsRef,
  sourceType,
  hlsQualityEnabled,
  pipSupported,
  isPip,
  onPipToggle,
  screenshotEnabled,
  onScreenshot,
  onToggleTheatre,
  theatreMode,
  ccMenuOpen,
  setCcMenuOpen,
  showSubtitles,
  setShowSubtitles,
  subtitleUrl,
  setActivePanel,
  activePanel,
  preview,
  handleMouseMove,
  handleMouseLeave,
  ctrlVis,
  hasEpisodes,
  onToggleEpisodes,
  isHost = true,
}) {
  return (
    <div
      className={`video-controls absolute inset-x-0 bottom-0 z-20 transition-all duration-300
      ${ctrlVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

      <div className="relative px-3 sm:px-4 pb-3 sm:pb-4 pt-8 space-y-2">
        <SeekBar
          localTime={localTime}
          duration={duration}
          bufferedPct={bufferedPct}
          onSeekChange={onSeekChange}
          onSeekCommit={onSeekCommit}
          preview={preview}
          handleMouseMove={handleMouseMove}
          handleMouseLeave={handleMouseLeave}
          canControl={canControl}
        />

        <div className="flex items-center gap-1.5">
          <button
            onClick={onPlayPause}
            disabled={!canControl}
            className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-[var(--radius-pill)] border border-white/10 transition-all active:scale-90 shrink-0
              ${canControl ? "bg-white/10 hover:bg-white/10 text-white" : "bg-white/10 text-white/40 cursor-not-allowed"}`}
          >
            {isPlaying ? (
              <PauseIcon className="w-4 h-4" />
            ) : (
              <PlayIcon className="w-4 h-4 ml-px" />
            )}
          </button>

          <VolumeControl
            volume={volume}
            muted={muted}
            onVolumeChange={onVolumeChange}
            onMuteToggle={onMuteToggle}
          />

          {hlsQualityEnabled && hlsQuality && sourceType === "hls" && (
            <HlsQualitySelector
              hlsQuality={hlsQuality}
              hlsRef={hlsRef}
            />
          )}

          {!canControl && (
            <span className="text-[9px] font-mono text-amber/60 flex items-center gap-1 shrink-0">
              <LockSmallIcon className="w-3 h-3" />
              <span className="hidden sm:inline uppercase tracking-wider">
                Host only
              </span>
            </span>
          )}

          <span className="text-[11px] font-mono text-white/60 tabular-nums shrink-0 hidden sm:inline">
            {formatTime(localTime)} <span className="text-white/30">/</span> {formatTime(duration)}
          </span>

          <div className="flex-1 min-w-0" />

          <div
            className="flex items-center bg-white/10 border border-white/10 rounded-[var(--radius-pill)] p-0.5 transition-all duration-400 overflow-hidden shrink-0"
            style={{ maxWidth: ccMenuOpen ? "220px" : "36px", width: "auto" }}
          >
            <button
              onClick={() => {
                if (!ccMenuOpen) setCcMenuOpen(true);
                else if (subtitleUrl) setShowSubtitles((s) => !s);
              }}
              className={`w-8 h-8 flex items-center justify-center rounded-[var(--radius-pill)] transition-all shrink-0
                ${subtitleUrl && showSubtitles ? "bg-amber text-void" : subtitleUrl ? "bg-amber/20 text-amber" : "text-white/40 hover:text-white"}`}
            >
              <CcIcon className="w-3.5 h-3.5" />
            </button>

            {ccMenuOpen && (
              <div className="flex items-center gap-0.5 pl-0.5 animate-in fade-in slide-in-from-left-2 duration-200">
                <div className="w-px h-4 bg-white/10 mx-0.5 shrink-0" />
                {[
                  { id: "search", Icon: SearchIcon },
                  {
                    id: "recent",
                    Icon: ({ className }) => (
                      <svg
                        className={className}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    ),
                  },
                  { id: "settings", Icon: SettingsIcon },
                ].map(({ id, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActivePanel(id)}
                    className={`w-8 h-8 flex items-center justify-center rounded-[var(--radius-pill)] transition-all hover:bg-white/10 ${activePanel === id ? "text-amber" : "text-white/40 hover:text-white"}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
                <button
                  onClick={() => {
                    setActivePanel(null);
                    setCcMenuOpen(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-pill)] text-white/40 hover:text-white transition-all hover:bg-white/10 shrink-0"
                >
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {canControl && (
            <SpeedPicker value={playbackRate} onChange={onSpeedChange} />
          )}

          <div className="flex items-center gap-1.5">
            {pipSupported && (
              <button
                onClick={onPipToggle}
                title="Picture-in-Picture"
                className={`w-8 h-8 flex items-center justify-center rounded-[var(--radius-pill)] border transition-all active:scale-90
                  ${isPip ? "bg-amber/20 text-amber border-amber/30" : "bg-white/10 hover:bg-white/10 border-white/10 text-white/40 hover:text-white"}`}
              >
                <PipIcon className="w-3.5 h-3.5" />
              </button>
            )}

            {screenshotEnabled && onScreenshot && (
              <button
                onClick={onScreenshot}
                title="Screenshot to chat"
                className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-pill)] bg-white/10 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all active:scale-90"
              >
                <CameraIcon className="w-3.5 h-3.5" />
              </button>
            )}
            {onToggleTheatre && (
              <button
                onClick={onToggleTheatre}
                title={theatreMode ? "Exit theatre (T)" : "Theatre mode (T)"}
                className={`w-8 h-8 flex items-center justify-center rounded-[var(--radius-pill)] border transition-all active:scale-90
                  ${theatreMode ? "bg-amber/20 text-amber border-amber/30" : "bg-white/10 hover:bg-white/10 border-white/10 text-white/40 hover:text-white"}`}
              >
                <TheatreIconSvg className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isHost && hasEpisodes && onToggleEpisodes && (
            <button
              onClick={onToggleEpisodes}
              title="Episodes"
              className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-pill)] bg-white/10 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all active:scale-90"
            >
              <EpisodesIcon className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onFullscreenToggle}
            className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-pill)] bg-white/10 hover:bg-white/10 border border-white/10 text-white transition-all active:scale-90 shrink-0"
          >
            {fullscreen ? (
              <CompressIcon className="w-4 h-4" />
            ) : (
              <ExpandIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function HlsQualitySelector({ hlsQuality, hlsRef }) {
  const levels = hlsRef?.current?.levels || [];
  const currentLevel = hlsRef?.current?.currentLevel ?? -1;

  if (levels.length <= 1) {
    return (
      <span className="hidden lg:flex items-center h-8 px-3 rounded-[var(--radius-pill)] bg-white/10 border border-white/10 text-[10px] font-mono font-bold text-white/40 shrink-0 select-none">
        {hlsQuality.level}
        {hlsQuality.level && hlsQuality.bitrate && (
          <span className="text-white/40 mx-1.5">•</span>
        )}
        {hlsQuality.bitrate}
      </span>
    );
  }

  const allLevels = [
    { level: -1, label: "Auto" },
    ...levels.map((l, i) => ({
      level: i,
      label: l.height ? `${l.height}p` : "Unknown",
    })),
  ];

  return (
    <div className="relative group hidden lg:block">
      <button
        className="flex items-center h-8 px-3 rounded-[var(--radius-pill)] bg-white/10 hover:bg-white/15 transition-colors border border-white/10 text-[10px] font-mono font-bold text-white/60 hover:text-white shrink-0 cursor-pointer"
      >
        {hlsQuality.level}
        <svg className="w-3 h-3 ml-1" viewBox="0 0 12 12" fill="currentColor">
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>
      <div className="absolute bottom-full right-0 mb-2 glass-card rounded-xl p-1.5 min-w-[120px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
        {allLevels.map(({ level, label }) => (
          <button
            key={level}
            onClick={() => {
              if (hlsRef?.current) hlsRef.current.currentLevel = level;
            }}
            className={`w-full px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-colors text-left ${
              level === currentLevel
                ? "bg-amber/20 text-amber"
                : "text-white/50 hover:text-white hover:bg-white/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

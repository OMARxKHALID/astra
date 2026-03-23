"use client";

import { memo } from "react";
import { classifyUrl } from "@/lib/videoSource";
import NativeVideoPlayer from "./NativeVideoPlayer";
import YouTubePlayer from "./YouTubePlayer";
import VimeoPlayer from "./VimeoPlayer";

// memo prevents re-renders when RoomClient state unrelated to video changes (e.g. playerChatOpen).
// Without this, toggling the fullscreen chat overlay causes YouTubePlayer to re-render and the
// iframe to visually "lift" — even though no video props changed.
function VideoPlayer({
  videoRef,
  videoUrl,
  subtitleUrl,
  isHost,
  isPlaying,
  playbackRate = 1,
  onPlay,
  onPause,
  onSeek,
  onSpeed,
  canControl = true,
  onLoad,
  onSubtitleChange,
  onAmbiColors,
  screenshotEnabled = true,
  hlsQualityEnabled = true,
  scrubPreviewEnabled = true,
  onSendScreenshot,
  addToast,
  theatreMode = false,
  onToggleTheatre,
}) {
  const source = classifyUrl(videoUrl);

  if (source.type === "mp4" || source.type === "hls")
    return (
      <NativeVideoPlayer
        videoRef={videoRef}
        videoUrl={videoUrl}
        subtitleUrl={subtitleUrl}
        sourceType={source.type}
        isHost={isHost}
        isPlaying={isPlaying}
        playbackRate={playbackRate}
        onPlay={onPlay}
        onPause={onPause}
        onSeek={onSeek}
        onSpeed={onSpeed}
        canControl={canControl}
        onLoad={onLoad}
        onSubtitleChange={onSubtitleChange}
        onAmbiColors={onAmbiColors}
        screenshotEnabled={screenshotEnabled}
        hlsQualityEnabled={hlsQualityEnabled}
        scrubPreviewEnabled={scrubPreviewEnabled}
        onSendScreenshot={onSendScreenshot}
        addToast={addToast}
        theatreMode={theatreMode}
        onToggleTheatre={onToggleTheatre}
      />
    );

  if (source.type === "youtube")
    return (
      <YouTubePlayer
        videoRef={videoRef}
        videoId={source.videoId}
        isHost={isHost}
        isPlaying={isPlaying}
        playbackRate={playbackRate}
        onPlay={onPlay}
        onPause={onPause}
        onSeek={onSeek}
        onSpeed={onSpeed}
        canControl={canControl}
        onLoad={onLoad}
        onAmbiColors={onAmbiColors}
        theatreMode={theatreMode}
        onToggleTheatre={onToggleTheatre}
      />
    );

  if (source.type === "vimeo")
    return (
      <VimeoPlayer
        videoRef={videoRef}
        videoId={source.videoId}
        isHost={isHost}
        isPlaying={isPlaying}
        playbackRate={playbackRate}
        onPlay={onPlay}
        onPause={onPause}
        onSeek={onSeek}
        onSpeed={onSpeed}
        canControl={canControl}
        onLoad={onLoad}
        onAmbiColors={onAmbiColors}
        theatreMode={theatreMode}
        onToggleTheatre={onToggleTheatre}
      />
    );

  // Empty / unsupported state
  return (
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center gap-4">
      <div className="absolute inset-0 bg-gradient-to-br from-void via-surface/60 to-void" />
      <div className="relative z-10 flex flex-col items-center gap-3 text-center px-8">
        <div className="w-14 h-14 rounded-[2rem] bg-white/4 border border-white/8 flex items-center justify-center mb-1">
          <svg
            className="w-7 h-7 text-white/20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="2" width="20" height="20" rx="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="2" y1="7" x2="7" y2="7" />
            <line x1="2" y1="17" x2="7" y2="17" />
            <line x1="17" y1="17" x2="22" y2="17" />
            <line x1="17" y1="7" x2="22" y2="7" />
          </svg>
        </div>
        <p className="text-sm text-dim/50 max-w-xs leading-relaxed">
          {videoUrl
            ? "Unsupported URL. Paste a direct MP4, HLS stream, YouTube, or Vimeo link."
            : "No video loaded. Paste a URL above to start watching together."}
        </p>
      </div>
    </div>
  );
}

export default memo(VideoPlayer);

"use client";

import { memo, useEffect } from "react";
import { classifyUrl } from "@/lib/videoResolver";
import NativeVideoPlayer from "./players/NativeVideoPlayer";
import YouTubePlayer from "./players/YouTubePlayer";
import VimeoPlayer from "./players/VimeoPlayer";
import EmbedPlayer from "./players/EmbedPlayer";

function VideoPlayer({
  videoRef,
  videoUrl,
  subtitleUrl,
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
  ambilightEnabled = true,
  onSendScreenshot,
  addToast,
  theatreMode = false,
  onToggleTheatre,
  onToggleChat,
  hasEpisodes = false,
  onToggleEpisodes,
}) {
  const source = classifyUrl(videoUrl);

  // [Note] Ref Cleanup: Ensure stale video references from previous players are
  // cleared when switching to an 'embed' or 'unsupported' mode to avoid ghosts.
  useEffect(() => {
    if (
      (source.type === "embed" || source.type === "unsupported") &&
      videoRef?.current
    ) {
      videoRef.current = null;
    }
  }, [source.type, videoRef]);

  if (source.type === "mp4" || source.type === "hls")
    return (
      <NativeVideoPlayer
        videoRef={videoRef}
        videoUrl={videoUrl}
        subtitleUrl={subtitleUrl}
        sourceType={source.type}
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
        ambilightEnabled={ambilightEnabled}
        onSendScreenshot={onSendScreenshot}
        addToast={addToast}
        theatreMode={theatreMode}
        onToggleTheatre={onToggleTheatre}
        onToggleChat={onToggleChat}
        hasEpisodes={hasEpisodes}
        onToggleEpisodes={onToggleEpisodes}
      />
    );

  if (source.type === "youtube")
    return (
      <YouTubePlayer
        videoRef={videoRef}
        videoId={source.videoId}
        isPlaying={isPlaying}
        playbackRate={playbackRate}
        onPlay={onPlay}
        onPause={onPause}
        onSeek={onSeek}
        onSpeed={onSpeed}
        canControl={canControl}
        onLoad={onLoad}
        onAmbiColors={onAmbiColors}
        ambilightEnabled={ambilightEnabled}
        theatreMode={theatreMode}
        onToggleTheatre={onToggleTheatre}
        onToggleChat={onToggleChat}
        hasEpisodes={hasEpisodes}
        onToggleEpisodes={onToggleEpisodes}
      />
    );

  if (source.type === "vimeo")
    return (
      <VimeoPlayer
        videoRef={videoRef}
        videoId={source.videoId}
        isPlaying={isPlaying}
        playbackRate={playbackRate}
        onPlay={onPlay}
        onPause={onPause}
        onSeek={onSeek}
        onSpeed={onSpeed}
        canControl={canControl}
        onLoad={onLoad}
        onAmbiColors={onAmbiColors}
        ambilightEnabled={ambilightEnabled}
        theatreMode={theatreMode}
        onToggleTheatre={onToggleTheatre}
        onToggleChat={onToggleChat}
        hasEpisodes={hasEpisodes}
        onToggleEpisodes={onToggleEpisodes}
      />
    );

  if (source.type === "embed")
    return (
      <EmbedPlayer
        videoUrl={videoUrl}
        canControl={canControl}
        theatreMode={theatreMode}
        onToggleTheatre={onToggleTheatre}
        onToggleChat={onToggleChat}
        hasEpisodes={hasEpisodes}
        onToggleEpisodes={onToggleEpisodes}
      />
    );

  return (
    <div className="relative w-full h-full bg-void flex flex-col items-center justify-center gap-4">
      <div className="absolute inset-0 bg-gradient-to-br from-void via-surface/60 to-void" />
      <div className="relative z-10 flex flex-col items-center gap-3 text-center px-8">
        <div className="w-14 h-14 rounded-[var(--radius-pill)] bg-white/10 border border-white/10 flex items-center justify-center mb-1">
          <svg
            className="w-7 h-7 text-white/10"
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
            ? "Unsupported URL. Paste a direct MP4, HLS, YouTube, Vimeo, or embed link."
            : "No video loaded. Select a title from the home page or paste a URL."}
        </p>
      </div>
    </div>
  );
}

export default memo(VideoPlayer);

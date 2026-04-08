"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import { classifyUrl } from "@/lib/videoResolver";
import ErrorOverlay from "./players/native/components/ErrorOverlay";

const NativeVideoPlayer = dynamic(() => import("./players/NativeVideoPlayer"), {
  ssr: false,
});
const YouTubePlayer = dynamic(() => import("./players/YouTubePlayer"), {
  ssr: false,
});
const VimeoPlayer = dynamic(() => import("./players/VimeoPlayer"), {
  ssr: false,
});
const EmbedPlayer = dynamic(() => import("./players/EmbedPlayer"), {
  ssr: false,
});

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
  hasEpisodes = false,
  onToggleEpisodes,
  onServerChange,
  onEnded,
  isHost = true,
  isRoom = false,
  syncHubEnabled = false,
}) {
  const source = classifyUrl(videoUrl);

  if (
    source.type === "mp4" ||
    source.type === "hls" ||
    source.type === "direct"
  )
    return (
      <NativeVideoPlayer
        videoRef={videoRef}
        videoUrl={source.url || videoUrl}
        subtitleUrl={subtitleUrl}
        sourceType={source.type}
        isPlaying={isPlaying}
        playbackRate={playbackRate}
        onPlay={onPlay}
        onPause={onPause}
        onSeek={onSeek}
        onSpeed={onSpeed}
        onEnded={onEnded}
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
        hasEpisodes={hasEpisodes}
        onToggleEpisodes={onToggleEpisodes}
        isHost={isHost}
        isRoom={isRoom}
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
        onEnded={onEnded}
        canControl={canControl}
        onLoad={onLoad}
        onAmbiColors={onAmbiColors}
        ambilightEnabled={ambilightEnabled}
        theatreMode={theatreMode}
        onToggleTheatre={onToggleTheatre}
        hasEpisodes={hasEpisodes}
        onToggleEpisodes={onToggleEpisodes}
        isHost={isHost}
        isRoom={isRoom}
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
        onEnded={onEnded}
        canControl={canControl}
        onLoad={onLoad}
        onAmbiColors={onAmbiColors}
        ambilightEnabled={ambilightEnabled}
        theatreMode={theatreMode}
        onToggleTheatre={onToggleTheatre}
        hasEpisodes={hasEpisodes}
        onToggleEpisodes={onToggleEpisodes}
        isHost={isHost}
        isRoom={isRoom}
      />
    );

  if (source.type === "embed")
    return (
      <EmbedPlayer
        videoUrl={videoUrl}
        isPlaying={isPlaying}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        canControl={canControl}
        theatreMode={theatreMode}
        onToggleTheatre={onToggleTheatre}
        hasEpisodes={hasEpisodes}
        onToggleEpisodes={onToggleEpisodes}
        onServerChange={onServerChange}
        onLoad={onLoad}
        isHost={isHost}
        isRoom={isRoom}
        syncHubEnabled={syncHubEnabled}
      />
    );

  if (videoUrl) {
    return (
      <div className="relative w-full h-full bg-void flex flex-col items-center justify-center">
        <ErrorOverlay
          error={{
            title: "URL Not Supported",
            detail: "This URL format isn't recognized or the content is private/unavailable.",
          }}
          onRetry={() => {}}
          onDismiss={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-void flex flex-col items-center justify-center gap-4">
      <div className="absolute inset-0 bg-gradient-to-br from-void via-surface/60 to-void" />
      <div className="relative z-10 flex flex-col items-center gap-3 text-center px-8">
        <div className="w-14 h-14 rounded-full bg-white/10 border border-white/10 flex items-center justify-center mb-1">
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
        <p className="text-[12px] font-mono uppercase tracking-[0.2em] text-white/20 max-w-xs leading-relaxed">
          Room is ready. Paste a video link to begin.
        </p>
      </div>
    </div>
  );
}

export default memo(VideoPlayer);

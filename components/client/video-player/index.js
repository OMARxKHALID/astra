"use client";

import { classifyUrl } from "@/lib/videoSource";
import NativeVideoPlayer from "./NativeVideoPlayer";
import YouTubePlayer from "./YouTubePlayer";
import VimeoPlayer from "./VimeoPlayer";
import { ExclamationIcon } from "./utils";

export default function VideoPlayer({
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
  chatOverlay,
  onLoad,
  onSubtitleChange,
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
        chatOverlay={chatOverlay}
        onLoad={onLoad}
        onSubtitleChange={onSubtitleChange}
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
        chatOverlay={chatOverlay}
        onLoad={onLoad}
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
        chatOverlay={chatOverlay}
        onLoad={onLoad}
      />
    );

  return (
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center gap-3">
      <ExclamationIcon className="w-10 h-10 text-muted/40" />
      <p className="text-sm text-dim/50 text-center px-8 max-w-xs leading-relaxed">
        {videoUrl
          ? "Unsupported URL. Paste a direct MP4, HLS stream, YouTube, or Vimeo link."
          : "No video loaded. Paste a URL above."}
      </p>
    </div>
  );
}

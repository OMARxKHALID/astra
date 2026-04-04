"use client";

import { AlertTriangle as ExclamationIcon } from "lucide-react";

export default function ErrorOverlay({ error, onRetry, onDismiss }) {
  if (!error) return null;

  const errorTitle = typeof error === "object" ? error.title : "Playback Error";

  const TIPS_MAP = {
    "Video Blocked by Browser": [
      "Try a different video URL or CDN host",
      "Use a CORS-enabled proxy or server",
      "Host the video file on your own server",
    ],
    "Network Error": [
      "Check your internet connection",
      "Try reloading the page",
      "Use a different video URL",
    ],
    "Video Not Found": [
      "Double-check the URL is correct",
      "The video may have been removed",
      "Try a different video source",
    ],
    "Access Denied": [
      "The video may require authentication",
      "Try a publicly accessible URL",
      "Use an embed player URL instead",
    ],
    "Stream Error": [
      "The HLS stream may have expired",
      "Try refreshing the stream URL",
      "Check if the source is still live",
    ],
    "Video Not Supported": [
      "Use a direct .mp4 or .m3u8 URL",
      "Paste a YouTube or Vimeo link",
      "Try a CDN/proxy URL with a known extension",
    ],
    "Cannot Play Video": [
      "Use a direct .mp4 or .m3u8 URL",
      "YouTube or Vimeo links work best",
      "Try an embed player URL instead",
    ],
    "Playback Failed": [
      "Use a direct .mp4 or .m3u8 URL",
      "YouTube or Vimeo links work best",
      "CDN proxy URL ending in .mp4",
    ],
    "Video Format Error": [
      "Use a .mp4, .webm, or .m3u8 URL",
      "YouTube or Vimeo links are reliable",
      "Check if the file codec is H.264",
    ],
    "Custom URL Failed": [
      "Use a direct .mp4 or .m3u8 URL",
      "Workers.dev and CDN proxy URLs are supported",
      "Try a YouTube, Vimeo, or embed URL",
    ],
  };

  const tips = TIPS_MAP[errorTitle] ?? [
    "Direct .mp4 or .m3u8 stream URL",
    "YouTube or Vimeo link",
    "CDN/proxy URL ending in .mp4",
  ];

  const showTips = errorTitle in TIPS_MAP;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-void/92 backdrop-blur-xl gap-5 text-center px-6 z-30">
      <div className="w-14 h-14 rounded-[var(--radius-pill)] bg-danger/10 flex items-center justify-center border border-danger/20 shrink-0">
        <ExclamationIcon className="w-7 h-7 text-danger" />
      </div>
      <div className="max-w-sm w-full">
        <h3 className="font-display font-bold text-lg text-white/40">
          {errorTitle}
        </h3>
        <p className="text-sm text-white/40 mt-2 leading-relaxed">
          {typeof error === "object" ? error.detail : error}
        </p>

        {showTips && (
          <div className="mt-4 flex flex-col gap-2 text-left">
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
              Try instead:
            </p>
            {tips.map((tip) => (
              <div
                key={tip}
                className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-pill)] bg-white/10 border border-white/10"
              >
                <span className="w-1 h-1 rounded-full bg-jade shrink-0" />
                <span className="text-[11px] text-white/40">{tip}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="h-10 px-6 rounded-[var(--radius-pill)] bg-amber text-void font-black text-xs uppercase tracking-widest hover:bg-amber active:scale-95 transition-all"
        >
          Try Again
        </button>
        <button
          onClick={onDismiss}
          className="h-10 px-5 rounded-[var(--radius-pill)] glass-card text-white/40 hover:text-white text-xs font-bold transition-all"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

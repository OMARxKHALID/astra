"use client";

import { AlertTriangle as ExclamationIcon } from "lucide-react";

export default function ErrorOverlay({ error, onRetry, onDismiss }) {
  if (!error) return null;

  const errorTitle = typeof error === "object" ? error.title : "Playback Error";
  const showTips = ["Video Not Supported", "Cannot Play Video", "Playback Failed", "Format Not Supported"].includes(errorTitle);

  const getTips = () => {
    if (errorTitle === "Video Blocked by Browser") {
      return [
        "Try a different video URL",
        "Use a CORS-enabled proxy",
        "Host video on your own server",
      ];
    }
    if (errorTitle === "Network Error") {
      return [
        "Check your internet connection",
        "Try reloading the page",
        "Use a different video URL",
      ];
    }
    if (errorTitle === "Video Not Found" || errorTitle === "Access Denied") {
      return [
        "Check if the URL is correct",
        "The video may have been removed",
        "Try a different video source",
      ];
    }
    return [
      "Direct .mp4 or .m3u8 stream URL",
      "YouTube or Vimeo link",
      "CDN/proxy URL ending in .mp4",
    ];
  };

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
            {getTips().map((tip) => (
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

"use client";

import { useState } from "react";
import {
  classifyUrl,
  isStrictVideoUrl,
  SOURCE_LABELS,
} from "@/lib/videoSource";
import { Link2 as LinkIcon, Shield as ShieldIcon } from "lucide-react";

export default function VideoUrlInput({
  isHost,
  currentUrl,
  currentSubtitleUrl,
  onLoad,
  strictVideoUrlMode = false,
}) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  // Client-side validation error shown inline before even submitting.
  const [strictError, setStrictError] = useState("");

  const source = classifyUrl(currentUrl);
  const inputSource = classifyUrl(input);
  const showDetected = input.trim() && inputSource.type !== "unsupported";

  // Re-validate whenever the input changes so the error clears as soon as the
  // user fixes the URL, not only after they click Load.
  function handleChange(e) {
    const val = e.target.value;
    setInput(val);
    if (strictVideoUrlMode && val.trim()) {
      setStrictError(
        isStrictVideoUrl(val.trim())
          ? ""
          : "Unsupported URL: Only direct video file links are allowed in this room.",
      );
    } else {
      setStrictError("");
    }
  }

  function handleSubmit(e) {
    e?.preventDefault();
    if (!input.trim() || !isHost) return;

    // Client-side preflight check — block the submit and show an inline error
    // before even sending to the server. The server will also reject it, but
    // this gives immediate, clear feedback without a round-trip.
    if (strictVideoUrlMode && !isStrictVideoUrl(input.trim())) {
      setStrictError(
        "Unsupported URL: Only direct video file links are allowed in this room.",
      );
      return;
    }

    setStrictError("");
    onLoad(input.trim(), ""); // Reset subs when loading a new video from here
    setInput("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSubmit();
  }

  // ── Viewer (non-host) ────────────────────────────────────────────────────
  if (!isHost) {
    return (
      <div className="flex items-center gap-4 w-full h-full">
        <div className="flex items-center justify-center w-8 h-8 rounded-[2rem] bg-jade/10 border border-jade/20 shrink-0">
          <LinkIcon className="w-4 h-4 text-jade/70" />
        </div>
        <div className="flex-1 min-w-0 px-1 overflow-hidden">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-mono font-bold text-jade uppercase tracking-wider">
              Now Playing
            </span>
            <span className="text-[10px] font-mono text-white/20 px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 uppercase tracking-tight">
              {SOURCE_LABELS[source.type]}
            </span>
            {strictVideoUrlMode && (
              <span
                title="Strict URL mode — only direct video files are accepted"
                className="flex items-center gap-1 text-[9px] font-black text-jade/70 uppercase tracking-tight"
              >
                <ShieldIcon className="w-3 h-3" />
                <span className="hidden sm:inline">Strict</span>
              </span>
            )}
          </div>
          <div className="text-sm text-white/60 font-mono truncate max-w-full">
            {currentUrl || "No video loaded"}
            {currentSubtitleUrl && (
              <span className="ml-2 text-[10px] text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
                CC ACTIVE
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Host ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-4 w-full h-full min-w-0">
      {/* Link / shield icon */}
      <div
        className={`flex items-center justify-center w-9 h-9 rounded-[2rem] border transition-all duration-300 shrink-0
          ${
            strictVideoUrlMode
              ? "bg-jade/10 border-jade/30"
              : focused
                ? "bg-amber-500/10 border-amber-500/40"
                : "bg-white/5 border-white/10"
          }`}
      >
        {strictVideoUrlMode ? (
          <ShieldIcon
            className={`w-4 h-4 transition-colors duration-300 ${focused ? "text-jade" : "text-jade/50"}`}
          />
        ) : (
          <LinkIcon
            className={`w-4.5 h-4.5 transition-colors duration-300 ${focused ? "text-amber-400" : "text-white/30"}`}
          />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        <label htmlFor="video-url" className="sr-only">
          Video URL
        </label>

        {/* Strict mode banner — visible to host when mode is active */}
        {strictVideoUrlMode && (
          <div className="flex items-center gap-1.5 text-[9px] font-black text-jade/70 uppercase tracking-[0.15em] mb-0.5">
            <ShieldIcon className="w-3 h-3 shrink-0" />
            Direct files only · .mp4 · .webm · .ogg · .mkv · .mov · .avi
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            id="video-url"
            type="url"
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={
              currentUrl
                ? `Current: ${currentUrl.slice(0, 48)}…`
                : strictVideoUrlMode
                  ? "Paste a direct video URL (.mp4, .webm…)"
                  : "Paste a video URL to sync…"
            }
            className="flex-1 bg-transparent text-sm text-white focus:text-white placeholder:text-white/10
                       font-mono outline-none truncate"
          />
          {/* Detected type badge — only shown when URL is valid */}
          {showDetected && !strictError && (
            <span
              className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-[2rem] bg-jade/10 border border-jade/20
                             text-[9px] font-black text-jade uppercase tracking-tighter shrink-0 animate-in fade-in zoom-in-95"
            >
              <span className="w-1 h-1 rounded-full bg-jade animate-pulse" />
              {SOURCE_LABELS[inputSource.type]}
            </span>
          )}
        </div>

        {/* Inline strict-mode validation error */}
        {strictError && (
          <p className="text-[10px] font-mono text-danger/80 leading-tight mt-0.5 animate-in fade-in slide-in-from-top-1">
            {strictError}
          </p>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!input.trim() || Boolean(strictError)}
        title="Load video for all participants"
        className="shrink-0 h-10 px-6 rounded-[2rem] bg-amber-500 text-void
                   text-[11px] font-black uppercase tracking-widest
                   hover:bg-amber-400 active:scale-95 disabled:opacity-30 disabled:pointer-events-none disabled:bg-white/10 disabled:text-white/30
                   transition-all duration-200 shadow-lg shadow-amber-500/10 border border-amber-400/50"
      >
        Load
      </button>
    </div>
  );
}

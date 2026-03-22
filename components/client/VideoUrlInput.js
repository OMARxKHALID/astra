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
  const [strictError, setStrictError] = useState("");

  const source = classifyUrl(currentUrl);
  const inputSource = classifyUrl(input);
  const showDetected = input.trim() && inputSource.type !== "unsupported";

  function handleChange(e) {
    const val = e.target.value;
    setInput(val);
    if (strictVideoUrlMode && val.trim()) {
      setStrictError(
        isStrictVideoUrl(val.trim())
          ? ""
          : "Only direct video file links are allowed in this room.",
      );
    } else {
      setStrictError("");
    }
  }

  function handleSubmit(e) {
    e?.preventDefault();
    if (!input.trim() || !isHost) return;
    if (strictVideoUrlMode && !isStrictVideoUrl(input.trim())) {
      setStrictError("Only direct video file links are allowed in this room.");
      return;
    }
    setStrictError("");
    onLoad(input.trim(), "");
    setInput("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSubmit();
  }

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
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded-full uppercase tracking-tight"
              style={{
                color: "var(--color-muted)",
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              {SOURCE_LABELS[source.type]}
            </span>
            {strictVideoUrlMode && (
              <span className="flex items-center gap-1 text-[9px] font-black text-jade/70 uppercase tracking-tight">
                <ShieldIcon className="w-3 h-3" />
                <span className="hidden sm:inline">Strict</span>
              </span>
            )}
          </div>
          <div
            className="text-sm font-mono truncate max-w-full"
            style={{ color: "var(--color-muted)" }}
          >
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

  return (
    <div className="flex items-center gap-4 w-full h-full min-w-0">
      <div
        className={`flex items-center justify-center w-9 h-9 rounded-[2rem] border transition-all duration-300 shrink-0
          ${strictVideoUrlMode ? "bg-jade/10 border-jade/30" : focused ? "bg-amber-500/10 border-amber-500/40" : ""}`}
        style={
          !strictVideoUrlMode && !focused
            ? {
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }
            : undefined
        }
      >
        {strictVideoUrlMode ? (
          <ShieldIcon
            className={`w-4 h-4 transition-colors duration-300 ${focused ? "text-jade" : "text-jade/50"}`}
          />
        ) : (
          <LinkIcon
            className={`w-4.5 h-4.5 transition-colors duration-300 ${focused ? "text-amber-400" : ""}`}
            style={!focused ? { color: "var(--color-muted)" } : undefined}
          />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        <label htmlFor="video-url" className="sr-only">
          Video URL
        </label>

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
            className="flex-1 bg-transparent text-sm font-mono outline-none truncate"
            style={{ color: "var(--color-text)" }}
          />
          {showDetected && !strictError && (
            <span className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-[2rem] bg-jade/10 border border-jade/20 text-[9px] font-black text-jade uppercase tracking-tighter shrink-0 animate-in fade-in zoom-in-95">
              <span className="w-1 h-1 rounded-full bg-jade animate-pulse" />
              {SOURCE_LABELS[inputSource.type]}
            </span>
          )}
        </div>

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
        className="shrink-0 h-10 px-4 sm:px-6 rounded-[2rem] bg-amber-500 text-void text-[11px] font-black uppercase tracking-widest hover:bg-amber-400 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 shadow-lg shadow-amber-500/10 border border-amber-400/50"
      >
        Load
      </button>
    </div>
  );
}

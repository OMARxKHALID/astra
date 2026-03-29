"use client";

import { useState } from "react";
import {
  classifyUrl,
  isStrictVideoUrl,
  SOURCE_LABELS,
} from "@/lib/videoResolver";
import { Link2 as LinkIcon, Shield as ShieldIcon, Youtube } from "lucide-react";
import YouTubeSearch from "./YouTubeSearch";
import { useToast } from "@/components/Toast";

export default function URLBar({
  isHost,
  currentUrl,
  currentSubtitleUrl,
  onLoad,
  strictVideoUrlMode = false,
}) {
  const { addToast } = useToast();
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [strictError, setStrictError] = useState("");
  const [mode, setMode] = useState("url");
  const [loading, setLoading] = useState(false);

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
    addToast("Synchronizing video...", "success");
    onLoad(input.trim(), "");
    setInput("");
  }

  if (!isHost) {
    return (
      <div className="flex items-center gap-4 w-full h-full px-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-pill)] bg-jade/10 border border-jade/20 shrink-0">
          <LinkIcon className="w-4 h-4 text-jade/70" />
        </div>
        <div className="flex-1 min-w-0 px-1 overflow-hidden">
          <div className="flex items-center gap-3 mb-0.5">
            <span className="text-[10px] font-mono font-bold text-jade uppercase tracking-wider">
              Now Playing
            </span>
            <span
              className="text-[9px] font-mono px-2 py-0.5 rounded-[var(--radius-pill)] uppercase tracking-tight flex items-center gap-1.5"
              style={{
                color: "var(--color-jade)",
                backgroundColor: "rgba(var(--color-jade-rgb),  0.1)",
                border: "1px solid rgba(var(--color-jade-rgb),  0.2)",
              }}
            >
              <span className="w-1 h-1 rounded-full bg-jade animate-pulse" />
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
              <span className="ml-2 text-[10px] text-amber/80 bg-amber/10 px-1.5 py-0.5 rounded-[var(--radius-pill)]">
                CC ACTIVE
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 w-full h-full min-w-0 px-4">
      <div
        className="flex items-center gap-0.5 shrink-0 p-0.5 rounded-[var(--radius-pill)] border"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <button
          onClick={() => setMode("url")}
          title="Paste video URL"
          className={`w-8 h-8 flex items-center justify-center rounded-[var(--radius-pill)] transition-all duration-200
            ${mode === "url" ? "bg-amber text-void shadow-sm" : ""}`}
          style={mode !== "url" ? { color: "var(--color-muted)" } : undefined}
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => setMode("youtube")}
          title="Search YouTube"
          className={`w-8 h-8 flex items-center justify-center rounded-[var(--radius-pill)] transition-all duration-200
            ${mode === "youtube" ? "bg-[#FF0000] text-white shadow-sm" : ""}`}
          style={
            mode !== "youtube" ? { color: "var(--color-muted)" } : undefined
          }
        >
          <Youtube className="w-4 h-4" />
        </button>
      </div>

      {mode === "url" && (
        <form onSubmit={handleSubmit} className="flex-1 min-w-0 flex flex-col gap-2">
          {strictVideoUrlMode && (
            <div className="flex items-center gap-1.5 text-[9px] font-black text-jade/70 uppercase tracking-[0.15em] ml-4">
              <ShieldIcon className="w-3 h-3 shrink-0" />
              Direct files only · .mp4 · .webm · .ogg
            </div>
          )}
          <div className="flex items-center gap-3">
            <div
              className={`flex-1 min-w-0 relative flex items-center gap-3 px-4 h-10 rounded-[var(--radius-pill)] border transition-all duration-300 ${focused ? "ring-2 ring-amber/20 shadow-lg" : ""}`}
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: focused ? "rgba(var(--color-amber-rgb), 0.4)" : "var(--color-border)",
              }}
            >
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <input
                    id="video-url"
                    type="text"
                    value={input}
                    onChange={handleChange}
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
                    <span
                      className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--radius-pill)] text-[9px] font-black uppercase tracking-tighter shrink-0 animate-in fade-in zoom-in-95"
                      style={{
                        color: "var(--color-jade)",
                        backgroundColor: "rgba(var(--color-jade-rgb),  0.08)",
                        border: "1px solid rgba(var(--color-jade-rgb),  0.15)",
                      }}
                    >
                      <span className="w-1 h-1 rounded-full bg-jade animate-pulse" />
                      {SOURCE_LABELS[inputSource.type]}
                    </span>
                  )}
                </div>
              </div>
              {strictError && (
                <p className="absolute top-full left-0 mt-1.5 ml-4 text-[10px] font-mono text-danger/80 leading-tight animate-in fade-in slide-in-from-top-1">
                  {strictError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!input.trim() || Boolean(strictError) || loading}
              title="Load video for all participants"
              className="shrink-0 h-10 px-6 rounded-[var(--radius-pill)] bg-amber text-void text-[11px] font-black uppercase tracking-widest hover:bg-amber active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 shadow-lg shadow-amber/10 border border-amber/50 relative overflow-hidden"
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 2000); // [Note] simple visual feedback lock
              }}
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-void/30 border-t-void rounded-full animate-spin mx-auto" />
              ) : (
                "Load"
              )}
            </button>
          </div>
        </form>
      )}

      {mode === "youtube" && <YouTubeSearch onLoad={onLoad} />}
    </div>
  );
}

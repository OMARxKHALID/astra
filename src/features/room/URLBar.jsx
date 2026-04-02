"use client";

import { useState } from "react";
import {
  classifyUrl,
  isStrictVideoUrl,
  SOURCE_LABELS,
} from "@/lib/videoResolver";
import { Link2 as LinkIcon, Shield as ShieldIcon } from "lucide-react";
import YouTubeSearch from "./YouTubeSearch";
import { useToast } from "@/components/Toast";
import YoutubeIcon from "@/components/icons/YoutubeIcon";

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
    if (!input.trim() || !isHost || loading) return;
    if (strictVideoUrlMode && !isStrictVideoUrl(input.trim())) {
      setStrictError("Only direct video file links are allowed in this room.");
      return;
    }
    setStrictError("");
    setLoading(true);
    addToast("Synchronizing video...", "success");
    onLoad(input.trim(), "");
    setInput("");
    // [Note] Visual feedback: 2s spinner lock prevents accidental double-submit
    setTimeout(() => setLoading(false), 2000);
  }

  if (!isHost) {
    return (
      <div className="flex items-center gap-4 w-full h-full px-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-pill)] bg-jade/10 border border-jade/20 shrink-0">
          <LinkIcon className="w-4 h-4 text-jade/70" />
        </div>
        <div className="flex-1 min-w-0 px-1 overflow-hidden">
          {currentUrl && (
            <div className="flex items-center gap-3 mb-0.5 animate-in fade-in slide-in-from-left-2 duration-500">
              <span className="text-[11px] font-mono font-bold text-jade uppercase tracking-wider">
                Now Playing
              </span>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full uppercase tracking-tight flex items-center gap-1.5 border border-jade/20 bg-jade/10 text-jade">
                <span className="w-1 h-1 rounded-full bg-jade animate-pulse" />
                {SOURCE_LABELS[source.type] || "Video"}
              </span>
              {strictVideoUrlMode && (
                <span className="flex items-center gap-1 text-[10px] font-black text-jade/70 uppercase tracking-tight">
                  <ShieldIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">Strict</span>
                </span>
              )}
            </div>
          )}
          <div
            className="text-[13.5px] font-mono truncate max-w-full text-muted"
          >
            {currentUrl || "No video loaded"}
            {currentSubtitleUrl && (
              <span className="ml-2 text-[11px] text-amber/80 bg-amber/10 px-2 py-0.5 rounded-[var(--radius-pill)]">
                CC ACTIVE
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 w-full h-full min-w-0 px-4 relative">
      <div
        className="flex items-center gap-0.5 shrink-0 p-0.5 rounded-[var(--radius-pill)] border border-border bg-surface shadow-sm"
      >
        <button
          onClick={() => setMode("url")}
          title="Paste video URL"
          className={`w-8 h-8 flex items-center justify-center rounded-[var(--radius-pill)] transition-all duration-300
            ${mode === "url" ? "bg-amber text-void shadow-lg shadow-amber/20" : "text-white/20 hover:text-white/60"}`}
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => setMode("youtube")}
          title="Search YouTube"
          className={`w-8 h-8 flex items-center justify-center rounded-[var(--radius-pill)] transition-all duration-300
            ${mode === "youtube" ? "bg-white/10 text-white shadow-xl border border-white/10" : "text-white/20 hover:text-white/60"}`}
        >
          <YoutubeIcon size={16} />
        </button>
      </div>

      {mode === "url" && (
        <form onSubmit={handleSubmit} className="flex-1 min-w-0 flex items-center gap-3 relative">
          <div
            className={`flex-1 min-w-0 h-10 relative flex items-center gap-3 px-4 rounded-[var(--radius-pill)] border transition-all duration-500 bg-surface/50 backdrop-blur-sm ${focused ? "ring-2 ring-amber/20 shadow-2xl border-amber/50" : "border-border"}`}
          >
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <input
                ref={null}
                id="video-url"
                type="text"
                value={input}
                onChange={handleChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={
                  currentUrl
                    ? `Current: ${currentUrl.slice(0, 48)}…`
                    : "Paste a video URL to sync…"
                }
                className="flex-1 bg-transparent text-[12px] font-mono outline-none truncate text-white/90 placeholder:text-white/20"
                autoComplete="off"
              />
            </div>

            {showDetected && !strictError && (
              <span className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-pill)] text-[9px] font-black uppercase tracking-tighter border border-jade/20 bg-jade/10 text-jade animate-in fade-in zoom-in-95">
                <span className="w-1 h-1 rounded-full bg-jade animate-pulse" />
                {SOURCE_LABELS[inputSource.type]}
              </span>
            )}

            {strictError && (
              <div className="absolute top-full left-4 bg-danger text-void text-[9px] font-black uppercase px-2 py-0.5 rounded-b-md shadow-lg animate-in slide-in-from-top-1">
                {strictError}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!input.trim() || Boolean(strictError) || loading}
            className="h-10 px-6 rounded-[var(--radius-pill)] bg-amber text-void text-[12px] font-black uppercase tracking-[0.1em] hover:brightness-110 active:scale-95 disabled:opacity-20 transition-all shadow-lg shadow-amber/20 border border-amber/50 shrink-0"
          >
            {loading ? <div className="w-3.5 h-3.5 border-2 border-void/30 border-t-void rounded-full animate-spin" /> : "Sync"}
          </button>
        </form>
      )}

      {mode === "youtube" && <YouTubeSearch onLoad={onLoad} />}
    </div>
  );
}

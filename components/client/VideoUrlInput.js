"use client";

import { useState } from "react";
import { classifyUrl, SOURCE_LABELS } from "@/lib/videoSource";

export default function VideoUrlInput({ isHost, currentUrl, onLoad }) {
  const [input,   setInput]   = useState("");
  const [focused, setFocused] = useState(false);

  const source      = classifyUrl(currentUrl);
  const inputSource = classifyUrl(input);
  const showPreview = input.trim() && inputSource.type !== "unsupported";

  function handleSubmit(e) {
    e?.preventDefault();
    if (!input.trim() || !isHost) return;
    onLoad(input.trim());
    setInput("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSubmit();
  }

  if (!isHost) {
    return (
      <div className="flex items-center gap-3 w-full min-w-0">
        <div className="w-2 h-2 rounded-full bg-jade/60 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-mono text-muted/60 uppercase tracking-[0.25em] mb-0.5">
            Now playing · {SOURCE_LABELS[source.type]}
          </p>
          <p className="text-xs text-white/40 font-mono truncate max-w-full">
            {currentUrl || "No video loaded"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 w-full min-w-0">
      <div className="flex-1 min-w-0 relative">
        <label htmlFor="video-url" className="sr-only">Video URL</label>
        <input
          id="video-url"
          type="url"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={currentUrl ? `Current: ${currentUrl.slice(0, 40)}…` : "Paste a video URL…"}
          className="w-full bg-transparent text-sm text-text placeholder:text-white/15
                     font-mono outline-none pr-2 truncate"
        />
        {showPreview && focused && (
          <div className="absolute left-0 -bottom-7 flex items-center gap-1.5 text-[10px] font-mono text-jade/70">
            <span className="w-1.5 h-1.5 rounded-full bg-jade/60" />
            {SOURCE_LABELS[inputSource.type]} detected
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!input.trim()}
        aria-label="Load video"
        className="shrink-0 h-9 px-5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400
                   text-xs font-bold uppercase tracking-wider
                   hover:bg-amber-500/20 hover:border-amber-500/40
                   active:scale-95 disabled:opacity-30 disabled:pointer-events-none
                   transition-all duration-150"
      >
        Load
      </button>
    </div>
  );
}

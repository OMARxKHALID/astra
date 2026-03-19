"use client";

import { useState } from "react";
import { classifyUrl, SOURCE_LABELS } from "@/lib/videoSource";
import { LinkIcon } from "./Icons";

export default function VideoUrlInput({ isHost, currentUrl, onLoad }) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);

  const source = classifyUrl(currentUrl);
  const inputSource = classifyUrl(input);
  const showDetected = input.trim() && inputSource.type !== "unsupported";

  function handleSubmit(e) {
    e?.preventDefault();
    if (!input.trim() || !isHost) return;
    onLoad(input.trim());
    setInput("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSubmit();
  }

  // --- Visitor View ---
  if (!isHost) {
    return (
      <div className="flex items-center gap-4 w-full h-full">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-jade/10 border border-jade/20 shrink-0">
          <LinkIcon className="w-4 h-4 text-jade/70" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-mono font-bold text-jade uppercase tracking-wider">Now Playing</span>
            <span className="text-[10px] font-mono text-white/20 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 uppercase tracking-tight">
              {SOURCE_LABELS[source.type]}
            </span>
          </div>
          <div className="text-sm text-white/60 font-mono truncate max-w-full">
            {currentUrl || "No video loaded"}
          </div>
        </div>
      </div>
    );
  }

  // --- Host View ---
  return (
    <div className="flex items-center gap-4 w-full h-full">
      <div className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-300 shrink-0
         ${focused ? "bg-amber-500/10 border-amber-500/40" : "bg-white/5 border-white/10"}`}>
        <LinkIcon className={`w-4.5 h-4.5 transition-colors duration-300 ${focused ? "text-amber-400" : "text-white/30"}`} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <label htmlFor="video-url" className="sr-only">Video URL</label>
        <div className="flex items-center gap-2">
           <input
            id="video-url"
            type="url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={currentUrl ? `Current: ${currentUrl.slice(0, 48)}…` : "Paste a video URL to sync…"}
            className="flex-1 bg-transparent text-sm text-white focus:text-white placeholder:text-white/10
                       font-mono outline-none truncate"
          />
          {showDetected && (
            <span className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-jade/10 border border-jade/20 
                             text-[9px] font-black text-jade uppercase tracking-tighter shrink-0 animate-in fade-in zoom-in-95">
              <span className="w-1 h-1 rounded-full bg-jade animate-pulse" />
              {SOURCE_LABELS[inputSource.type]}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!input.trim()}
        title="Load video for all participants"
        className="shrink-0 h-10 px-6 rounded-xl bg-amber-500 text-void
                   text-[11px] font-black uppercase tracking-widest
                   hover:bg-amber-400 active:scale-95 disabled:opacity-30 disabled:pointer-events-none disabled:bg-white/10 disabled:text-white/30
                   transition-all duration-200 shadow-lg shadow-amber-500/10 border border-amber-400/50"
      >
        Load
      </button>
    </div>
  );
}

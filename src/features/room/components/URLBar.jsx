"use client";

import { useState, useRef, useEffect } from "react";
import {
  classifyUrl,
  videoValidation,
  SOURCE_LABELS,
} from "@/lib/videoResolver";
import {
  Link2 as LinkIcon,
  Shield as ShieldIcon,
  Upload as UploadIcon,
} from "lucide-react";
import { YouTubeSearch } from "./YouTubeSearch";
import { useToast } from "@/components/Toast";
import { YoutubeIcon } from "@/components/icons/YoutubeIcon";
import { localStorage } from "@/utils/localStorage";
import { LS_KEYS } from "@/constants/config";
import { Button } from "@/components/ui/Button";

export function URLBar({
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
  const [isDragging, setIsDragging] = useState(false);
  const [localFileName, setLocalFileName] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    setLocalFileName(localStorage.get(LS_KEYS.localFileName) || "");
  }, []);

  useEffect(() => {
    if (currentUrl) {
      const src = classifyUrl(currentUrl);
      if (src.type === "youtube") {
        setMode("youtube");
      } else if (currentUrl.startsWith("blob:")) {
        setMode("upload");
      }
    }
  }, [currentUrl]);

  const source = classifyUrl(currentUrl);
  const inputSource = classifyUrl(input);
  const showDetected = input.trim() && inputSource.type !== "unsupported";

  // Check if current URL is a blob (local file)
  const isLocalFile = currentUrl?.startsWith("blob:");

  // Display name - always use currentUrl to avoid hydration mismatch
  // localFileName is only used when syncing new uploads
  const displayUrl = currentUrl;

  function handleChange(e) {
    const val = e.target.value;
    setInput(val);
    if (strictVideoUrlMode && val.trim()) {
      setStrictError(
        videoValidation(val.trim())
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
    if (strictVideoUrlMode && !videoValidation(input.trim())) {
      setStrictError("Only direct video file links are allowed in this room.");
      return;
    }
    setStrictError("");
    setLoading(true);
    setLocalFileName("");
    localStorage.set(LS_KEYS.localFileName, "");
    onLoad(input.trim(), "");
    setInput("");
    setTimeout(() => setLoading(false), 3000);
  }

  function handleFileSelect(file) {
    if (!isHost) return;
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      addToast("Please select a video file", "error");
      return;
    }

    try {
      const blobUrl = URL.createObjectURL(file);
      setLocalFileName(file.name);
      localStorage.set(LS_KEYS.localFileName, file.name);
      addToast(`Local video loaded: ${file.name}`, "success");
      onLoad(blobUrl, "");
      setInput("");
    } catch {
      addToast("Failed to load video file", "error");
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        addToast("Please drop a video file", "error");
        return;
      }
      try {
        const blobUrl = URL.createObjectURL(file);
        setLocalFileName(file.name);
        localStorage.set(LS_KEYS.localFileName, file.name);
        addToast(`Local video loaded: ${file.name}`, "success");
        onLoad(blobUrl, "");
        setInput("");
      } catch {
        addToast("Failed to load video file", "error");
      }
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleFileInput(e) {
    const file = e.target.files[0];
    handleFileSelect(file);
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
                {isLocalFile ? "Local" : SOURCE_LABELS[source.type] || "Video"}
              </span>
              {strictVideoUrlMode && (
                <span className="flex items-center gap-1 text-[10px] font-black text-jade/70 uppercase tracking-tight">
                  <ShieldIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">Strict</span>
                </span>
              )}
            </div>
          )}
          <div className="text-[13.5px] font-mono truncate max-w-full text-muted">
            {displayUrl || "No video loaded"}
            {isLocalFile && (
              <span className="ml-2 text-[10px] text-jade/80 bg-jade/10 px-2 py-0.5 rounded-[var(--radius-pill)]">
                LOCAL
              </span>
            )}
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
      <div className="flex items-center gap-0.5 shrink-0 p-0.5 rounded-[var(--radius-pill)] border border-border bg-surface shadow-sm">
        <button
          onClick={() => setMode("url")}
          aria-label="Paste video URL"
          title="Paste video URL"
          className={`w-8 h-8 flex items-center justify-center rounded-[var(--radius-pill)] transition-all duration-300
            ${mode === "url" ? "bg-amber text-void shadow-lg shadow-amber/20" : "text-white/20 hover:text-white/60"}`}
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => setMode("youtube")}
          aria-label="Search YouTube"
          title="Search YouTube"
          className={`w-8 h-8 flex items-center justify-center rounded-[var(--radius-pill)] transition-all duration-300
            ${mode === "youtube" ? "bg-white/10 text-white shadow-xl border border-white/10" : "text-white/20 hover:text-white/60"}`}
        >
          <YoutubeIcon size={16} />
        </button>
        <button
          onClick={() => setMode("upload")}
          aria-label="Upload local video"
          title="Upload local video"
          className={`w-8 h-8 flex items-center justify-center rounded-[var(--radius-pill)] transition-all duration-300
            ${mode === "upload" ? "bg-amber text-void shadow-lg shadow-amber/20" : "text-white/20 hover:text-white/60"}`}
        >
          <UploadIcon className="w-4 h-4" />
        </button>
      </div>

      {mode === "url" && (
        <div className="relative flex-1 min-w-0">
          {isDragging && (
            <div className="absolute inset-0 rounded-[var(--radius-pill)] bg-amber/10 border-2 border-dashed border-amber/50 flex items-center justify-center z-10 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-amber text-[12px] font-bold uppercase tracking-wider">
                <UploadIcon className="w-4 h-4" />
                Drop video file
              </div>
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3 relative"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div
              className={`flex-1 min-w-0 h-10 relative flex items-center gap-3 px-4 rounded-[var(--radius-pill)] border transition-all duration-500 bg-surface/50 backdrop-blur-sm ${focused ? "ring-2 ring-amber/20 shadow-2xl border-amber/50" : "border-border"} ${isDragging ? "border-amber bg-amber/5" : ""}`}
            >
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <input
                  id="video-url"
                  type="text"
                  value={input}
                  onChange={handleChange}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder={
                    displayUrl
                      ? `Current: ${displayUrl.slice(0, 48)}…`
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

            <Button
              type="submit"
              loading={loading}
              disabled={!input.trim() || Boolean(strictError) || loading}
              className="!h-10 px-6 uppercase tracking-[0.1em] shrink-0"
            >
              {!loading && "Sync"}
            </Button>
          </form>
        </div>
      )}

      {mode === "youtube" && <YouTubeSearch onLoad={onLoad} />}

      {mode === "upload" && (
        <div
          className="flex-1 min-w-0 flex items-center gap-3"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {isLocalFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 h-10 flex items-center gap-3 px-4 rounded-[var(--radius-pill)] border border-amber/30 bg-amber/5 cursor-pointer hover:bg-amber/10 transition-all"
            >
              <UploadIcon className="w-4 h-4 text-amber shrink-0" />
              <span className="text-[12px] font-mono text-white truncate flex-1">
                {localFileName || "Local Video (Click to replace)"}
              </span>
              <span className="text-[10px] text-amber/60 bg-amber/10 px-2 py-0.5 rounded-full shrink-0">
                LOCAL
              </span>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 h-10 flex items-center justify-center gap-2 px-4 rounded-[var(--radius-pill)] border border-dashed border-amber/30 bg-amber/5 cursor-pointer hover:bg-amber/10 transition-all"
            >
              <UploadIcon className="w-4 h-4 text-amber" />
              <span className="text-[12px] font-mono text-white/60">
                Click to upload or drag video
              </span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}

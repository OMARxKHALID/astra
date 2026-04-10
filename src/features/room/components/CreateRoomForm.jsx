"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  Link as LinkIcon,
  Plus as PlusIcon,
  AlertCircle as ExclamationIcon,
  ChevronRight,
  Sparkles,
  Upload as UploadIcon,
} from "lucide-react";
import YoutubeIcon from "@/components/icons/YoutubeIcon";
import Button from "@/components/ui/Button";
import { useSession } from "next-auth/react";
import { createRoom } from "../services/createRoom";
import { ls } from "@/utils/localStorage";
import { LS_KEYS, MAX_HISTORY_ENTRIES } from "@/constants/config";

export default function CreateRoomForm({ onResultsChange }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("url"); // "url" | "search"
  const [ytResults, setYtResults] = useState([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytLoadingMore, setYtLoadingMore] = useState(false);
  const [localFileName, setLocalFileName] = useState("");
  const [nextPageToken, setNextPageToken] = useState(null);

  const scrollRef = useRef(null);
  const bottomTriggerRef = useRef(null);

  // Notify parent so the hero hides when results are showing
  useEffect(() => {
    onResultsChange?.(mode === "search" && ytResults.length > 0);
  }, [ytResults, mode, onResultsChange]);

  // Append the next page of results when the sentinel scrolls into view
  const loadMore = useCallback(async () => {
    if (ytLoadingMore || !nextPageToken || !url.trim()) return;
    setYtLoadingMore(true);
    try {
      const res = await fetch(
        `/api/youtube?q=${encodeURIComponent(url.trim())}&pageToken=${nextPageToken}`,
      );
      const resJson = await res.json();
      if (resJson.success && resJson.data.items) {
        setYtResults((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          return [
            ...prev,
            ...resJson.data.items.filter((i) => !seen.has(i.id)),
          ];
        });
        setNextPageToken(resJson.data.nextPageToken || null);
      }
    } catch {
      // silent — user can scroll again
    } finally {
      setYtLoadingMore(false);
    }
  }, [ytLoadingMore, nextPageToken, url]);

  // IntersectionObserver drives infinite scroll on the sentinel div
  useEffect(() => {
    if (!nextPageToken || !bottomTriggerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { root: scrollRef.current, threshold: 0.1 },
    );
    observer.observe(bottomTriggerRef.current);
    return () => observer.disconnect();
  }, [nextPageToken, loadMore]);

  async function handleCreate(e, customUrl) {
    if (e) e.preventDefault();

    if (mode === "search" && !customUrl && url.trim().length >= 2) {
      setYtLoading(true);
      setYtResults([]);
      setNextPageToken(null);
      try {
        const res = await fetch(
          `/api/youtube?q=${encodeURIComponent(url.trim())}`,
        );
        const resJson = await res.json();
        if (resJson.success) {
          setYtResults(resJson.data.items || []);
          setNextPageToken(resJson.data.nextPageToken || null);
        } else {
          setYtResults([]);
          setNextPageToken(null);
        }
      } catch {
        setError("YouTube search failed");
      } finally {
        setYtLoading(false);
      }
      return;
    }

    const targetUrl = customUrl || url;
    const trimmed = targetUrl.trim();

    if (trimmed && !isValidUrl(trimmed)) {
      setError("Invalid URL");
      return;
    }

    setLoading(true);
    setError("");

    const { roomId, userId, createPromise } = createRoom(trimmed, session);

    // Save hostId for room page to use
    const { hostId } = await createPromise;
    localStorage.setItem(`hostId_${roomId}`, hostId || "");

    try {
      const history = JSON.parse(ls.get(LS_KEYS.history) || "[]");
      const ytMatch = trimmed.match(
        /(?:youtube\.com\/watch\?.*v=|youtu\.be\/)([A-Za-z0-9_-]{11})/,
      );
      const entry = {
        roomId,
        videoUrl: trimmed,
        thumbnail: ytMatch
          ? `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`
          : null,
        title:
          trimmed.replace(/^https?:\/\//, "").slice(0, 60) ||
          `Room ${roomId.slice(0, 4)}`,
        lastVisited: Date.now(),
      };
      ls.set(
        LS_KEYS.history,
        JSON.stringify(
          [entry, ...history.filter((h) => h.roomId !== roomId)].slice(
            0,
            MAX_HISTORY_ENTRIES,
          ),
        ),
      );
    } catch {}

    try {
      await createPromise;
    } catch {
      setError("Failed to create room");
      setLoading(false);
      return;
    }

    router.push(`/room/${roomId}?url=${encodeURIComponent(trimmed)}&h=1`);
  }

  function isValidUrl(str) {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }

  function switchMode(next) {
    setMode(next);
    setUrl("");
    setYtResults([]);
    setNextPageToken(null);
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("Please select a valid video file");
      return;
    }

    try {
      const blobUrl = URL.createObjectURL(file);
      setLocalFileName(file.name);
      ls.set(LS_KEYS.localFileName, file.name);
      await handleCreate(null, blobUrl);
    } catch {
      setError("Failed to create room with local file");
    }
  }

  return (
    <div className="glass-card p-7 relative rounded-[var(--radius-panel)] shadow-2xl border-border bg-white/[0.03]">
      <div className="mb-6 flex flex-col gap-4">
        <div>
          <h2
            className="font-display text-xl font-semibold mb-1"
            style={{ color: "var(--color-bright)" }}
          >
            Start a new room
          </h2>
          <p className="text-sm font-mono text-muted uppercase tracking-widest mt-1">
            Pick a video and invite friends.
          </p>
        </div>

        <div className="flex p-1 rounded-[var(--radius-pill)] border shadow-inner bg-surface/50 border-border overflow-hidden w-full mt-1">
          <ModeBtn
            active={mode === "url"}
            onClick={() => switchMode("url")}
            icon={<LinkIcon className="w-4 h-4" />}
          >
            LINK
          </ModeBtn>
          <ModeBtn
            active={mode === "search"}
            onClick={() => switchMode("search")}
            icon={<YoutubeIcon size={16} />}
          >
            SEARCH
          </ModeBtn>
          <ModeBtn
            active={mode === "upload"}
            onClick={() => switchMode("upload")}
            icon={<UploadIcon className="w-4 h-4" />}
          >
            UPLOAD
          </ModeBtn>
        </div>
      </div>

      <form onSubmit={(e) => handleCreate(e)} className="space-y-4">
        <div>
          <label
            htmlFor="videoUrl"
            className="block text-[10px] font-mono font-black text-amber-500/80 uppercase tracking-[0.2em] mb-3 ml-2"
          >
            {mode === "url"
              ? "Direct Video Link"
              : mode === "search"
                ? "YouTube Search"
                : "Local File"}
          </label>

          <div className="relative group/input">
            {mode === "upload" ? (
              <label className="w-full h-14 border rounded-[2rem] flex items-center pl-12 pr-4 text-sm font-sans outline-none transition-all cursor-pointer hover:border-white/20 border-border bg-surface text-white/60 group/upload relative shadow-sm">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 group-hover/upload:text-amber group-hover/upload:opacity-100 transition-all pointer-events-none">
                  <UploadIcon className="w-4 h-4 ml-1" />
                </div>
                <span className="truncate">
                  {localFileName || "Click to browse local video file"}
                </span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            ) : (
              <>
                <input
                  id="videoUrl"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={
                    mode === "url"
                      ? "https://youtube.com/watch?v=…"
                      : "Search for a movie, trailer…"
                  }
                  className="w-full h-14 border rounded-[2rem] pl-12 pr-4 text-sm font-sans outline-none transition-all focus:border-[var(--color-amber)] focus:shadow-[0_0_20px_rgba(var(--color-amber-rgb),0.1)]"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 group-focus-within/input:text-[var(--color-amber)] group-focus-within/input:opacity-100 transition-all pointer-events-none">
                  {mode === "url" ? (
                    <LinkIcon className="w-4 h-4 ml-1" />
                  ) : (
                    <Search className="w-4 h-4 ml-1" />
                  )}
                </div>
                {ytLoading && (
                  <div className="absolute right-5 top-1/2 -translate-y-1/2">
                    <div className="w-3.5 h-3.5 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                  </div>
                )}
              </>
            )}
          </div>

          {mode === "search" && ytResults.length > 0 && (
            <div className="mt-4 animate-in slide-in-from-top-4 fade-in duration-500 fill-mode-both">
              <div
                className="flex items-center gap-2 px-3 mb-2 text-[9px] font-mono uppercase tracking-widest opacity-40"
                style={{ color: "var(--color-text)" }}
              >
                <Sparkles className="w-3 h-3 text-amber-500/40" />
                Select a video to start instantly
              </div>
              <div
                ref={scrollRef}
                className="flex flex-col gap-1 overflow-y-auto no-scrollbar"
                style={{ maxHeight: "50vh" }}
              >
                {ytResults.map((item) => (
                  <Button
                    key={item.id}
                    variant="custom"
                    onClick={() => handleCreate(null, item.url)}
                    className="flex items-start gap-4 p-2.5 rounded-[1.5rem] hover:bg-white/5 active:bg-white/10 transition-all text-left group border border-transparent !h-auto !bg-transparent !p-2.5 !active:scale-[0.98] outline-none"
                  >
                    {item.thumb && (
                      <div className="w-24 aspect-video rounded-xl overflow-hidden border border-white/5 shrink-0 bg-black/40 mt-1">
                        <Image
                          src={item.thumb}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 flex flex-col justify-center h-full">
                      <p
                        className="text-[13px] font-bold line-clamp-2 leading-snug group-hover:text-amber transition-colors"
                        style={{ color: "var(--color-text)" }}
                      >
                        {item.title}
                      </p>
                      <p
                        className="text-[10px] font-mono uppercase mt-1 tracking-tight truncate opacity-40"
                        style={{ color: "var(--color-text)" }}
                      >
                        {item.channel}
                      </p>
                    </div>
                    <div className="shrink-0 w-8 h-8 rounded-full border border-white/10 mt-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                      <ChevronRight className="w-4 h-4 text-amber" />
                    </div>
                  </Button>
                ))}

                <div
                  ref={bottomTriggerRef}
                  className="h-10 flex items-center justify-center shrink-0"
                >
                  {ytLoadingMore && (
                    <div className="w-3.5 h-3.5 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                  )}
                  {!nextPageToken && ytResults.length > 0 && (
                    <p
                      className="text-[9px] font-mono uppercase tracking-[0.3em] opacity-20"
                      style={{ color: "var(--color-muted)" }}
                    >
                      ••• End of results •••
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-[2rem] bg-danger/10 border border-danger/20">
            <ExclamationIcon className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-danger font-bold">{error}</p>
          </div>
        )}

        {((!ytResults.length && mode !== "upload") || mode === "url") && (
          <Button
            type="submit"
            size="lg"
            loading={loading}
            className="w-full mt-2 !font-bold uppercase tracking-widest"
          >
            {!loading && (mode === "url" ? (
              <PlusIcon className="w-4 h-4" />
            ) : (
              <Search className="w-4 h-4" />
            ))}
            {mode === "url"
              ? url.trim()
                ? "Create Room"
                : "Create Empty Room"
              : url.trim()
                ? "Search YouTube"
                : "Create Empty Room"}
          </Button>
        )}
      </form>

      <p
        className="mt-5 text-[10px] text-center font-mono opacity-40"
        style={{ color: "var(--color-muted)" }}
      >
        Supports MP4 · WebM · HLS · YouTube · Vimeo
      </p>
    </div>
  );
}

function ModeBtn({ active, onClick, icon, children }) {
  return (
    <Button
      variant="custom"
      onClick={onClick}
      className={`flex-1 px-3 py-2 rounded-[var(--radius-pill)] text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300 flex items-center gap-2 border-none justify-center h-auto !p-2 !md:p-2 !lg:p-2 !scale-none active:!scale-95
        ${active ? "bg-amber text-void shadow-lg ring-1 ring-amber/20" : "text-white/40 hover:text-white/60 bg-transparent hover:bg-white/5"}`}
    >
      {icon}
      <span>{children}</span>
    </Button>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

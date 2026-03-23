"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Youtube,
  Link as LinkIcon,
  Plus as PlusIcon,
  AlertCircle as ExclamationIcon,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export default function CreateRoomForm({ onResultsChange }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("url"); // "url" | "search"
  const [ytResults, setYtResults] = useState([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytLoadingMore, setYtLoadingMore] = useState(false);
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
      const data = await res.json();
      if (data.items) {
        setYtResults((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          return [...prev, ...data.items.filter((i) => !seen.has(i.id))];
        });
        setNextPageToken(data.nextPageToken || null);
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

    // In search mode a bare submit triggers a search, not a room create
    if (mode === "search" && !customUrl) {
      if (!url.trim() || url.trim().length < 2) return;
      setYtLoading(true);
      setYtResults([]);
      setNextPageToken(null);
      try {
        const res = await fetch(
          `/api/youtube?q=${encodeURIComponent(url.trim())}`,
        );
        const data = await res.json();
        setYtResults(data.items || []);
        setNextPageToken(data.nextPageToken || null);
      } catch (err) {
        console.error("YouTube search failed:", err);
      } finally {
        setYtLoading(false);
      }
      return;
    }

    const targetUrl = customUrl || url;
    if (!targetUrl.trim()) return;

    setLoading(true);
    setError("");
    try {
      let userId = "";
      try {
        userId = localStorage.getItem("wt_userId") || "";
      } catch {}
      if (!userId) {
        userId = crypto.randomUUID();
        try {
          localStorage.setItem("wt_userId", userId);
        } catch {}
      }

      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: targetUrl.trim(), userId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create room");
      }
      const { roomId, hostToken } = await res.json();
      localStorage.setItem(`host_${roomId}`, hostToken);

      try {
        const cur = JSON.parse(localStorage.getItem("recent_rooms") || "[]");
        localStorage.setItem(
          "recent_rooms",
          JSON.stringify(
            [
              { id: roomId, url: targetUrl.trim(), time: Date.now() },
              ...cur.filter((r) => r.id !== roomId),
            ].slice(0, 5),
          ),
        );
      } catch {}

      router.push(
        `/room/${roomId}?url=${encodeURIComponent(targetUrl.trim())}`,
      );
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setUrl("");
    setYtResults([]);
    setNextPageToken(null);
  }

  return (
    <div className="glass-card p-7 relative">
      {/* Header + mode toggle */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2
            className="font-display text-xl font-semibold mb-1"
            style={{ color: "var(--color-bright)" }}
          >
            Start a new room
          </h2>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Pick a video and invite friends.
          </p>
        </div>

        <div
          className="flex p-1 rounded-2xl border shadow-inner"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <ModeBtn
            active={mode === "url"}
            onClick={() => switchMode("url")}
            icon={<LinkIcon className="w-3 h-3" />}
          >
            Link
          </ModeBtn>
          <ModeBtn
            active={mode === "search"}
            onClick={() => switchMode("search")}
            icon={<Youtube className="w-3 h-3" />}
          >
            Search
          </ModeBtn>
        </div>
      </div>

      <form onSubmit={(e) => handleCreate(e)} className="space-y-4">
        <div>
          <label
            htmlFor="videoUrl"
            className="block text-[10px] font-mono font-black text-amber-500/80 uppercase tracking-[0.2em] mb-3 ml-2"
          >
            {mode === "url" ? "Direct Video Link" : "YouTube Search"}
          </label>

          <div className="relative group/input">
            <input
              id="videoUrl"
              type={mode === "url" ? "url" : "text"}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                mode === "url"
                  ? "https://youtube.com/watch?v=…"
                  : "Search for a movie, trailer…"
              }
              required
              className="w-full h-14 border rounded-[2rem] pl-12 pr-4 text-sm font-sans outline-none transition-all focus:border-amber-500/40 focus:shadow-[0_0_20px_rgba(245,158,11,0.05)]"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
                color: "var(--color-text)",
              }}
            />
            <div className="absolute left-4.5 top-1/2 -translate-y-1/2 opacity-20 group-focus-within/input:text-amber-500 group-focus-within/input:opacity-100 transition-all">
              {mode === "url" ? (
                <LinkIcon className="w-4 h-4" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </div>
            {ytLoading && (
              <div className="absolute right-5 top-1/2 -translate-y-1/2">
                <div className="w-3.5 h-3.5 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* YouTube search results — infinite scroll, no scrollbar, no fixed height cap on card */}
          {mode === "search" && ytResults.length > 0 && (
            <div className="mt-4 animate-in slide-in-from-top-4 fade-in duration-500 fill-mode-both">
              <div
                className="flex items-center gap-2 px-3 mb-2 text-[9px] font-mono uppercase tracking-widest opacity-40"
                style={{ color: "var(--color-text)" }}
              >
                <Sparkles className="w-3 h-3 text-amber-500/40" />
                Select a video to start instantly
              </div>
              {/* 60vh cap so the list scrolls without extending the page; no-scrollbar hides the track */}
              <div
                ref={scrollRef}
                className="flex flex-col gap-1 overflow-y-auto no-scrollbar"
                style={{ maxHeight: "50vh" }}
              >
                {ytResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleCreate(null, item.url)}
                    className="flex items-center gap-4 p-2.5 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-all text-left group border border-transparent"
                  >
                    {item.thumb && (
                      <div className="w-24 aspect-video rounded-xl overflow-hidden border border-white/5 shrink-0 bg-black/40">
                        <img
                          src={item.thumb}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[12px] font-bold line-clamp-2 leading-snug group-hover:text-amber-400 transition-colors"
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
                    <div className="shrink-0 w-8 h-8 rounded-full border border-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                      <ChevronRight className="w-4 h-4 text-amber-500" />
                    </div>
                  </button>
                ))}

                {/* Infinite scroll sentinel */}
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
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-[2rem] bg-danger/8 border border-danger/20">
            <ExclamationIcon className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-danger/80 font-mono">{error}</p>
          </div>
        )}

        {/* Submit button — hidden while search results are showing */}
        {(!ytResults.length || mode === "url") && (
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full h-14 rounded-[2rem] bg-amber-500 text-void font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-400 active:scale-[0.98] transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none shadow-[0_10px_30px_rgba(245,158,11,0.2)]"
          >
            {loading ? (
              <>
                <Spinner /> Creating room…
              </>
            ) : (
              <>
                {mode === "url" ? (
                  <PlusIcon className="w-4 h-4" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {mode === "url" ? "Create Room" : "Search YouTube"}
              </>
            )}
          </button>
        )}
      </form>

      <p
        className="mt-5 text-[11px] text-center font-mono pb-2"
        style={{ color: "var(--color-muted)", opacity: 0.5 }}
      >
        Supports MP4 · WebM · HLS · YouTube · Vimeo
      </p>
    </div>
  );
}

function ModeBtn({ active, onClick, icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2
        ${active ? "bg-amber-500 text-void shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "opacity-40 hover:opacity-100 hover:bg-white/5"}`}
      style={active ? undefined : { color: "var(--color-text)" }}
    >
      {icon}
      {children}
    </button>
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

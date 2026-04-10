"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, X as XIcon } from "lucide-react";
import Image from "next/image";

const DEBOUNCE_MS = 340;

export default function YouTubeSearch({ onLoad }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);

  const containerRef = useRef(null);
  const resultsRef = useRef(null);
  const scrollRef = useRef(null);
  const bottomTriggerRef = useRef(null);
  const debounceRef = useRef(null);
  const prevQueryRef = useRef("");

  useEffect(() => {
    if (!open) return;
    const onMouse = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        (!resultsRef.current || !resultsRef.current.contains(e.target))
      )
        setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const search = useCallback(async (q) => {
    if (!q.trim()) return;
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetch(`/api/youtube?q=${encodeURIComponent(q.trim())}`);
      const resJson = await res.json();
      if (resJson.success) {
        setResults(resJson.data.items || []);
        setNextPageToken(resJson.data.nextPageToken || null);
        if (!resJson.data.items?.length) setOpen(false);
      } else {
        setResults([]);
        setNextPageToken(null);
      }
    } catch {
      setResults([]);
      setNextPageToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !nextPageToken || !query.trim()) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/youtube?q=${encodeURIComponent(query.trim())}&pageToken=${nextPageToken}`,
      );
      const resJson = await res.json();
      if (resJson.success && resJson.data.items) {
        setResults((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          return [...prev, ...resJson.data.items.filter((i) => !seen.has(i.id))];
        });
        setNextPageToken(resJson.data.nextPageToken || null);
      }
    } catch {
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextPageToken, query]);

  useEffect(() => {
    if (!open || !nextPageToken || !bottomTriggerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { root: scrollRef.current, threshold: 0.1 },
    );
    observer.observe(bottomTriggerRef.current);
    return () => observer.disconnect();
  }, [open, nextPageToken, loadMore]);

  function handleSelect(item) {
    onLoad(item.url, "");
    setQuery("");
    setResults([]);
    setOpen(false);
    setNextPageToken(null);
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setOpen(false);
    setNextPageToken(null);
    prevQueryRef.current = "";
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="flex-1 min-w-0">
      <div
        ref={containerRef}
        className={`relative flex items-center gap-3 px-4 py-2 rounded-[var(--radius-pill)] transition-all duration-300 border ${focused || open ? "ring-2 ring-amber/20 shadow-lg" : ""}`}
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor:
            focused || open ? "rgba(var(--color-amber-rgb), 0.4)" : "var(--color-border)",
        }}
      >
        <Search
          className="w-4 h-4 transition-colors shrink-0"
          style={{ color: focused ? "var(--color-amber)" : "var(--color-muted)" }}
        />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => {
            const q = e.target.value;
            setQuery(q);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
              if (q.trim() && q !== prevQueryRef.current) {
                prevQueryRef.current = q.trim();
                search(q.trim());
              }
            }, DEBOUNCE_MS);
          }}
          onFocus={() => {
            setFocused(true);
            if (results.length) setOpen(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => e.key === "Enter" && search(query)}
          placeholder="Search YouTube…"
          className="flex-1 bg-transparent text-sm font-body outline-none"
          style={{ color: "var(--color-text)" }}
        />

        {loading && (
          <div className="flex items-center gap-1 shrink-0">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-amber animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}

        {query && !loading && (
          <button
            onClick={clearSearch}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            style={{ color: "var(--color-muted)" }}
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {typeof document !== "undefined" &&
        open &&
        results.length > 0 &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div
              className="absolute inset-0 bg-void/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            <div
              ref={resultsRef}
              className="relative z-10 w-full max-w-lg glass-card overflow-hidden shadow-[0_32px_120px_rgba(0,0,0,0.5)] animate-in zoom-in-95 fade-in duration-300 flex flex-col"
              style={{ borderRadius: "var(--radius-panel)", maxHeight: "55vh" }}
            >
              <div
                className="flex items-center justify-between px-7 py-5 border-b shrink-0"
                style={{ borderColor: "var(--color-border)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse shadow-[0_0_8px_rgba(var(--color-danger-rgb), 0.5)]" />
                  <div>
                    <h3
                      className="text-base font-display font-bold leading-tight"
                      style={{ color: "var(--color-bright)" }}
                    >
                      YouTube Results
                    </h3>
                    <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-amber/80">
                      Select to load for everyone
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
                  style={{ color: "var(--color-muted)" }}
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div
                ref={scrollRef}
                className="p-3 flex-1 overflow-y-auto thin-scrollbar"
              >
                <div className="flex flex-col gap-0.5">
                  {results.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="flex items-center gap-4 text-left p-3 rounded-2xl group transition-all active:scale-[0.98] hover:bg-white/10"
                    >
                      {item.thumb && (
                        <div
                          className="relative w-28 aspect-video rounded-xl overflow-hidden border shrink-0"
                          style={{ borderColor: "var(--color-border)" }}
                        >
                          <Image
                            src={item.thumb}
                            alt={item.title}
                            fill
                            sizes="120px"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 pr-2">
                        <p
                          className="text-[13px] font-bold leading-snug line-clamp-2 group-hover:text-amber transition-colors"
                          style={{ color: "var(--color-text)" }}
                        >
                          {item.title}
                        </p>
                        <p
                          className="text-[10px] font-mono mt-1.5 uppercase tracking-tight truncate opacity-60"
                          style={{ color: "var(--color-muted)" }}
                        >
                          {item.channel}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <div
                  ref={bottomTriggerRef}
                  className="h-12 flex items-center justify-center"
                >
                  {loadingMore && (
                    <div
                      className="flex items-center gap-2 text-[10px] font-mono opacity-50 uppercase tracking-widest"
                      style={{ color: "var(--color-muted)" }}
                    >
                      <div className="w-3 h-3 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
                      Loading more…
                    </div>
                  )}
                  {!nextPageToken && results.length > 0 && (
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
          </div>,
          document.body,
        )}
    </div>
  );
}

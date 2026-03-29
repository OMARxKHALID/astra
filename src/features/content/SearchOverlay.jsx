"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Search, X, Play, Star } from "lucide-react";

const searchCache = new Map();

export default function SearchOverlay({ onClose, onPick }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIdx(0);
  }, [results]);

  useEffect(() => {
    if (!q.trim() || q.trim().length < 2) {
      setResults([]);
      return;
    }

    const trimmed = q.trim();
    if (searchCache.has(trimmed)) {
      setResults(searchCache.get(trimmed));
      return;
    }

    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/tmdb?q=${encodeURIComponent(trimmed)}`);
        const d = await r.json();
        const items = (d.items || []).slice(0, 10);
        setResults(items);
        if (searchCache.size >= 50) {
          searchCache.delete(searchCache.keys().next().value);
        }
        searchCache.set(trimmed, items);
      } catch {}
      setLoading(false);
    }, 340);
    return () => clearTimeout(t);
  }, [q]);

  const handleKey = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();

      const count = results.length;
      if (count > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIdx((prev) => (prev + 1) % count);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIdx((prev) => (prev - 1 + count) % count);
        } else if (e.key === "Enter") {
          e.preventDefault();
          onPick(results[activeIdx]);
          onClose();
        }
      }
    },
    [onClose, results, activeIdx, onPick],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-void/85 backdrop-blur-[24px] flex flex-col items-center pt-[80px] px-6 pb-6 animate-in fade-in duration-300"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[640px] mb-6 relative animate-in zoom-in-95 duration-300">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted pointer-events-none" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (
              ["ArrowDown", "ArrowUp", "Enter"].includes(e.key) &&
              results.length > 0
            ) {
              e.preventDefault();
            }
          }}
          placeholder="Search movies, series, anime…"
          className="w-full glass-card !bg-white/5 !backdrop-blur-3xl rounded-[var(--radius-pill)] py-4 pr-12 pl-[52px] text-bright text-base font-body outline-none focus:border-amber/40 focus:ring-4 focus:ring-amber/5 transition-all placeholder:text-white/30 shadow-2xl"
        />
        {loading ? (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full border-2 border-amber/20 border-t-amber animate-spin" />
        ) : (
          q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-muted flex p-1 hover:text-bright transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      {results.length > 0 && (
        <div className="w-full max-w-[640px] glass-card !rounded-[var(--radius-panel)] !border-white/10 overflow-hidden max-h-[calc(100vh-220px)] overflow-y-auto no-scrollbar shadow-[0_0_50px_rgba(255,255,255,0.03)] animate-in slide-in-from-top-4 duration-500">
          {results.map((item, i) => (
            <button
              key={item.id}
              onClick={() => {
                onPick(item);
                onClose();
              }}
              onMouseEnter={() => setActiveIdx(i)}
              className={`w-full flex gap-3.5 py-3.5 px-5 bg-transparent border-none cursor-pointer text-left items-center transition-all ${
                i === activeIdx
                  ? "bg-white/10 ring-1 ring-inset ring-white/10"
                  : "hover:bg-white/10"
              } ${i < results.length - 1 ? "border-b border-white/10" : ""}`}
            >
              <div className="relative shrink-0">
                {item.poster ? (
                  <Image
                    src={item.poster}
                    alt=""
                    width={40}
                    height={60}
                    className={`w-10 h-[60px] object-cover rounded-md transition-transform duration-300 ${i === activeIdx ? "scale-105 shadow-lg" : ""}`}
                  />
                ) : (
                  <div className="w-10 h-[60px] rounded-md bg-white/10 shrink-0" />
                )}
                {i === activeIdx && (
                  <div className="absolute inset-0 bg-amber/10 rounded-md" />
                )}
              </div>

              <div className="flex-1 min-w-0 ml-1">
                <p
                  className={`text-[15px] font-bold font-body mb-1 truncate transition-colors ${i === activeIdx ? "text-amber" : "text-bright"}`}
                >
                  {item.title}
                </p>
                <div className="flex gap-2 items-center">
                  <span
                    className={`text-[9px] font-bold px-[7px] py-[2px] rounded-[var(--radius-pill)] font-mono uppercase tracking-[0.1em] ${item.type === "tv" ? "bg-jade/15 text-jade" : "bg-amber/15 text-amber"}`}
                  >
                    {item.type === "tv" ? "Series" : "Movie"}
                  </span>
                  {item.year && (
                    <span className="text-[11px] text-muted font-mono font-medium">
                      {item.year}
                    </span>
                  )}
                  {item.rating && (
                    <span className="text-[11px] text-amber font-mono flex items-center gap-[2px] font-bold">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      {item.rating}
                    </span>
                  )}
                </div>
              </div>
              <Play
                className={`w-4 h-4 transition-all ${i === activeIdx ? "text-amber scale-125 opacity-100" : "text-white/10 opacity-50"}`}
              />
            </button>
          ))}
        </div>
      )}

      {q.trim().length > 1 && !loading && results.length === 0 && (
        <p className="text-muted text-sm font-body mt-2 animate-in fade-in duration-500">
          No results for "{q}"
        </p>
      )}
    </div>
  );
}

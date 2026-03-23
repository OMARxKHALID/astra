"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, Film, Star, X as XIcon } from "lucide-react";

export default function TmdbSearch({ onSelect, onHide }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const debounce = useRef(null);

  // Close on outside click or Escape
  useEffect(() => {
    const onMouse = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        onHide();
    };
    const onKey = (e) => {
      if (e.key === "Escape") onHide();
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [onHide]);

  // Debounced search — fires 450ms after the user stops typing
  const search = useCallback((q) => {
    clearTimeout(debounce.current);
    if (!q.trim() || q.trim().length < 2) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tmdb?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        setResults(data.items || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 450);
  }, []);

  function handleChange(e) {
    const val = e.target.value;
    setQuery(val);
    search(val);
  }

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-void/70 backdrop-blur-sm"
        onClick={onHide}
      />

      {/* Modal */}
      <div
        ref={containerRef}
        className="relative z-10 w-full max-w-lg glass-card overflow-hidden shadow-[0_32px_120px_rgba(0,0,0,0.5)] animate-in zoom-in-95 fade-in duration-300 flex flex-col"
        style={{
          borderRadius: "2.5rem",
          maxHeight: "75vh",
          backgroundColor: "var(--color-panel)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-7 py-5 border-b shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <div>
              <h3
                className="text-base font-display font-bold leading-tight"
                style={{ color: "var(--color-bright)" }}
              >
                TMDB Title Search
              </h3>
              <p
                className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-60"
                style={{ color: "var(--color-muted)" }}
              >
                Metadata provider
              </p>
            </div>
          </div>
          <button
            onClick={onHide}
            className="w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
            style={{ color: "var(--color-muted)" }}
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div
          className="p-4 border-b shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-300 focus-within:ring-2 focus-within:ring-amber-500/20"
            style={{
              borderColor: "var(--color-border)",
              backgroundColor: "rgba(7,9,13,0.3)",
            }}
          >
            <Search
              className="w-4 h-4 shrink-0"
              style={{ color: "var(--color-muted)" }}
            />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={handleChange}
              placeholder="Search movies or TV shows…"
              className="flex-1 bg-transparent text-sm font-body outline-none"
              style={{ color: "var(--color-text)" }}
            />
            {loading && (
              <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin shrink-0" />
            )}
          </div>
        </div>

        {/* Results list */}
        <div className="p-2 flex-1 overflow-y-auto thin-scrollbar">
          <div className="flex flex-col gap-0.5">
            {results.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  onHide();
                }}
                className="flex items-start gap-4 text-left p-3 rounded-2xl group transition-all active:scale-[0.98] hover:bg-white/5"
              >
                {item.poster && (
                  <div
                    className="relative w-14 aspect-[2/3] rounded-lg overflow-hidden border shrink-0"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1 py-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p
                      className="text-[14px] font-bold leading-tight group-hover:text-amber-400 transition-colors"
                      style={{ color: "var(--color-text)" }}
                    >
                      {item.title}
                    </p>
                    {item.year && (
                      <span
                        className="text-[10px] font-mono opacity-50 px-1.5 py-0.5 rounded-md"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.05)",
                          color: "var(--color-muted)",
                        }}
                      >
                        {item.year}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-[11px] leading-relaxed line-clamp-2 opacity-60"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {item.overview}
                  </p>
                  <div
                    className="flex items-center gap-3 mt-2 text-[10px] font-mono uppercase tracking-widest opacity-40"
                    style={{ color: "var(--color-muted)" }}
                  >
                    <span className="flex items-center gap-1">
                      <Film className="w-3 h-3" /> {item.type}
                    </span>
                    {item.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500" />{" "}
                        {item.rating}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {!loading && query.length > 1 && results.length === 0 && (
              <div className="py-16 text-center">
                <p
                  className="text-sm opacity-40"
                  style={{ color: "var(--color-muted)" }}
                >
                  No titles found for "{query}"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

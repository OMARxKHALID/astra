"use client";

import { useEffect, useRef } from "react";
import { X as XIcon, Star, Calendar, Film } from "lucide-react";

export default function TmdbPanel({ isOpen, onClose, tmdbMeta }) {
  const panelRef = useRef(null);

  // Close on outside click — small delay so the open-click doesn't immediately re-close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    const id = setTimeout(
      () => document.addEventListener("mousedown", handler),
      0,
    );
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handler);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !tmdbMeta) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        className="relative z-10 w-full sm:max-w-2xl mx-4 sm:mx-auto glass-card rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
      >
        {/* Backdrop image with gradient overlays */}
        {tmdbMeta.backdrop && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-[0.15] mix-blend-screen pointer-events-none"
              style={{ backgroundImage: `url(${tmdbMeta.backdrop})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-void to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-void via-void/80 to-transparent pointer-events-none" />
          </>
        )}

        <div className="relative p-8 md:p-10 flex flex-col md:flex-row gap-8">
          {/* Poster */}
          {tmdbMeta.poster && (
            <div className="shrink-0 max-w-[160px] md:max-w-[180px] self-start z-10 mx-auto md:mx-0">
              <img
                src={tmdbMeta.poster}
                alt={tmdbMeta.title}
                className="w-full h-auto object-cover rounded-[2rem] border border-white/10"
              />
            </div>
          )}

          {/* Details */}
          <div className="flex flex-col flex-1 z-10 mt-2">
            <div className="flex justify-between items-start mb-2">
              <h2
                className="font-display font-bold text-3xl max-w-[90%] leading-tight drop-shadow-md"
                style={{ color: "var(--color-bright)" }}
              >
                {tmdbMeta.title}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex shrink-0 items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.5)",
                }}
                aria-label="Close panel"
              >
                <XIcon className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>

            {/* Metadata badges */}
            <div className="flex flex-wrap gap-2 mb-6 text-[11px] font-mono tracking-wide">
              {tmdbMeta.rating && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-[2rem]">
                  <Star className="w-3 h-3 fill-amber-500/80" />
                  {tmdbMeta.rating} / 10
                </div>
              )}
              {tmdbMeta.year && (
                <div
                  className="flex items-center gap-1.5 px-3 py-1 border rounded-[2rem]"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderColor: "rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  <Calendar className="w-3 h-3 opacity-60" />
                  {tmdbMeta.year}
                </div>
              )}
              <div
                className="flex items-center gap-1.5 px-3 py-1 border rounded-[2rem] uppercase"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderColor: "rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                <Film className="w-3 h-3 opacity-60" />
                {tmdbMeta.type || "Movie"}
              </div>
            </div>

            {/* Synopsis */}
            <div>
              <h3
                className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Synopsis
              </h3>
              <p
                className="text-sm font-body leading-relaxed drop-shadow-sm"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                {tmdbMeta.overview || "No summary available for this title."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

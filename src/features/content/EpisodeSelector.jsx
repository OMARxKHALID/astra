"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, Play, Clock } from "lucide-react";

export default function EpisodeSelector({
  tmdbId,
  currentEpisode,
  currentSeason,
  onSelectEpisode,
  onClose,
  cache,
  setCache,
  totalSeasons: totalSeasonsProp,
}) {
  const [season, setSeason] = useState(Number(currentSeason) || 1);
  const [loading, setLoading] = useState(false);

  const activeRef = useRef(null);

  const episodes = cache?.[season]?.episodes || [];
  const seasonMeta = cache?.[season]?.meta || null;
  const totalSeasons = totalSeasonsProp || seasonMeta?.season_number || 1;

  useEffect(() => {
    if (!tmdbId || cache?.[season]) return;
    setLoading(true);

    fetch(`/api/tmdb/tv/${tmdbId}/season/${season}`)
      .then((r) => r.json())
      .then((data) => {
        setCache?.((prev) => ({
          ...prev,
          [season]: {
            episodes: data.episodes || [],
            meta: data.meta || null,
          },
        }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tmdbId, season, setCache]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [currentEpisode, season]);

  const handlePrevSeason = () => { if (season > 1) setSeason((s) => s - 1); };
  const handleNextSeason = () => { setSeason((s) => s + 1); };

  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-end pr-6 pt-24 pb-24">
      <div className="glass-card w-[280px] h-fit max-fit max-h-[520px] flex flex-col pointer-events-auto animate-in fade-in slide-in-from-right-4 duration-500 rounded-2xl shadow-2xl relative overflow-hidden bg-void/90 border border-white/5">
        {/* [Note] Header Section: Tactical alignment with high-contrast text */}
        <div className="px-3 pt-3.5 pb-2 relative z-10">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-[11px] font-black text-white/90 font-body uppercase tracking-[0.25em]">Watch List</h2>
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all border border-white/10 active:scale-95"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-white/5 rounded-xl border border-white/5 shadow-inner">
            <button
              onClick={handlePrevSeason}
              disabled={season <= 1}
              className="w-6 h-6 rounded-lg hover:bg-white/10 disabled:opacity-0 flex items-center justify-center text-white/50 hover:text-white transition-all"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <div className="flex-1 text-center font-mono">
              <span className="text-[9px] font-black text-amber uppercase tracking-[0.3em]">S{String(season).padStart(2, '0')}</span>
            </div>
            <button
              onClick={handleNextSeason}
              disabled={season >= totalSeasons}
              className="w-6 h-6 rounded-lg hover:bg-white/10 disabled:opacity-0 flex items-center justify-center text-white/50 hover:text-white transition-all"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto thin-scrollbar px-2 pb-2 relative z-10 scroll-smooth">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-amber/20 border-t-amber rounded-full animate-spin" />
              </div>
              <span className="text-[8px] uppercase font-bold tracking-[0.2em] text-white/40">Syncing...</span>
            </div>
          ) : (
            <div className="space-y-1 pt-1">
              {episodes.map((ep) => {
                const isActive = ep.number === Number(currentEpisode) && season === Number(currentSeason);
                return (
                  <button
                    key={ep.id}
                    ref={isActive ? activeRef : null}
                    onClick={() => onSelectEpisode(season, ep.number)}
                    className={`w-full group relative flex flex-col text-left transition-all duration-300 rounded-xl overflow-hidden border ${
                      isActive
                        ? "bg-amber/15 border-amber/40 shadow-inner ring-1 ring-amber/30"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex gap-2 p-2 tracking-tight">
                      <div className="relative w-14 h-8 rounded-md overflow-hidden shrink-0 shadow-md">
                        <img src={ep.still || "/placeholder.jpg"} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-void/40" />
                        {isActive && (
                           <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
                           </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pr-1">
                         <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-[8px] font-mono font-black ${isActive ? "text-amber" : "text-white/20"}`}>{String(ep.number).padStart(2, '0')}</span>
                            <h3 className={`text-[11.5px] font-bold truncate leading-none ${isActive ? "text-white" : "text-white/70"}`}>{ep.name}</h3>
                         </div>
                         <div className="flex items-center gap-1.5 opacity-60">
                            <Clock className="w-2.5 h-2.5 text-white/30" />
                            <span className="text-[8px] font-mono text-white/40">{ep.runtime || "??"}m</span>
                            {isActive && (
                               <span className="ml-auto text-[7px] font-black text-amber uppercase tracking-widest">Active</span>
                            )}
                         </div>
                      </div>
                    </div>

                    {isActive && ep.overview && (
                      <div className="px-2.5 pb-2.5 border-t border-amber/10 pt-1.5 mx-1.5 mb-1 opacity-90 overflow-hidden">
                        <p className="text-[9px] text-white/50 line-clamp-2 leading-snug italic font-body">{ep.overview}</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* [Note] Footer: Fixed metadata tracker with architectural alignment */}
        <div className="px-3.5 py-2.5 border-t border-white/5 bg-void relative z-20">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.25em]">{episodes.length} Episodes</span>
            <span className="text-[8px] font-mono text-white/40 font-bold tracking-widest">S{String(season).padStart(2, '0')} E{String(currentEpisode).padStart(2, '0')}</span>
          </div>
        </div>
        {/* Backdrop Decorative Glow */}
        <div className="absolute -bottom-24 -left-20 w-64 h-64 bg-amber/5 blur-[100px] pointer-events-none rounded-full z-0" />
      </div>
    </div>
  );
}

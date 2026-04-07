"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Clock, Play, Film, Layers } from "lucide-react";
import Button from "@/components/ui/Button";

export default function EpisodeSelector({
  tmdbId,
  currentEpisode,
  currentSeason,
  onSelectEpisode,
  onClose,
  cache,
  setCache,
  totalSeasons: totalSeasonsProp,
  poster,
  compact = false,
}) {
  const [season, setSeason] = useState(Number(currentSeason) || 1);
  const [loading, setLoading] = useState(false);
  const [hoveredEp, setHoveredEp] = useState(null);
  const [isOpen, setIsOpen] = useState(true);
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);
  const activeRef = useRef(null);
  const listRef = useRef(null);

  const episodes = cache?.[season]?.episodes || [];
  const seasonMeta = cache?.[season]?.meta || null;
  const totalSeasons = totalSeasonsProp || seasonMeta?.season_number || 1;

  useEffect(() => {
    if (!tmdbId || cache?.[season]) return;
    setLoading(true);
    fetch(`/api/tmdb/tv/${tmdbId}/season/${season}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          const data = res.data;
          setCache?.((prev) => ({
            ...prev,
            [season]: {
              episodes: data.episodes || [],
              meta: data.meta || null,
            },
          }));
        }
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

  const isActiveEp = (epNum) =>
    epNum === Number(currentEpisode) && season === Number(currentSeason);

  const handleSelect = (s, ep) => {
    onSelectEpisode(s, ep);
    if (compact) setIsOpen(false);
  };

  if (compact && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="group absolute bottom-[90px] left-3 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber/10 hover:bg-amber/20 border border-amber/20 text-amber/80 hover:text-amber text-[11px] font-mono font-bold tracking-wider transition-all active:scale-95"
      >
        <Layers className="w-3.5 h-3.5" />
        <span className="flex items-center gap-1">
          <span className="text-[10px] opacity-60">S{String(currentSeason).padStart(2, "0")}</span>
          <span className="w-px h-3 bg-amber/30" />
          <span>E{String(currentEpisode).padStart(2, "0")}</span>
        </span>
      </button>
    );
  }

  if (compact) {
    return (
      <div className="absolute bottom-[90px] left-3 right-16 z-30 flex flex-col rounded-2xl bg-[#0a0a0f]/95 backdrop-blur-2xl border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_1px_rgba(255,255,255,0.1)_inset] overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
        <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
          <button
            onClick={() => setShowSeasonPicker(!showSeasonPicker)}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber to-amber/60 flex items-center justify-center">
              <span className="text-[8px] font-black text-black">S</span>
            </div>
            <span className="font-mono font-bold text-amber text-[11px] tracking-wider">
              {String(season).padStart(2, "0")}
            </span>
            <ChevronRight className={`w-3 h-3 text-white/30 transition-transform ${showSeasonPicker ? "rotate-90" : ""}`} />
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => season > 1 && setSeason(season - 1)}
              disabled={season <= 1}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-20 text-white/50 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => season < totalSeasons && setSeason(season + 1)}
              disabled={season >= totalSeasons}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-20 text-white/50 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 text-white/30 hover:text-white transition-colors ml-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {showSeasonPicker && (
          <div className="shrink-0 px-2 py-2 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="flex gap-1 overflow-x-auto thin-scrollbar pb-1">
              {Array.from({ length: totalSeasons }, (_, i) => i + 1).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSeason(s);
                    setShowSeasonPicker(false);
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all
                    ${s === season ? "bg-amber text-black" : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"}`}
                >
                  S{String(s).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar p-2">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 rounded-full border border-amber/20 border-t-amber animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-1.5">
              {episodes.map((ep) => {
                const active = isActiveEp(ep.number);
                return (
                  <button
                    key={ep.id}
                    onClick={() => handleSelect(season, ep.number)}
                    onMouseEnter={() => setHoveredEp(ep.number)}
                    onMouseLeave={() => setHoveredEp(null)}
                    className={`group relative aspect-[1.6/1] rounded-lg text-[10px] font-mono font-bold transition-all duration-200 flex flex-col items-center justify-center gap-0.5 overflow-hidden
                      ${active 
                        ? "bg-gradient-to-br from-amber to-amber/80 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]" 
                        : "bg-white/[0.06] text-white/40 hover:bg-white/[0.12] hover:text-white border border-white/[0.04]"}`}
                  >
                    <span>{String(ep.number).padStart(2, "0")}</span>
                    {ep.still && (
                      <img 
                        src={ep.still} 
                        alt="" 
                        className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-opacity" 
                      />
                    )}
                    {active && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 px-4 py-2 border-t border-white/[0.06] bg-black/20">
          <div className="flex items-center justify-between text-[9px] font-mono text-white/30">
            <span>{episodes.length} episodes</span>
            <span className="text-amber/60 font-bold">
              S{String(season).padStart(2, "0")}E{String(currentEpisode).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[101] pointer-events-none">
        <div className="h-full w-[380px] pointer-events-auto flex flex-col bg-[#0a0a0f] border-l border-white/[0.06] shadow-[-20px_0_60px_rgba(0,0,0,0.4)] animate-in slide-in-from-right duration-300">
          <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber to-amber/60 flex items-center justify-center shadow-lg shadow-amber/20">
                <Layers className="w-4 h-4 text-black" />
              </div>
              <div>
                <h2 className="font-display font-bold text-[16px] text-white tracking-tight">
                  Episodes
                </h2>
                <p className="text-[9px] font-mono mt-0.5 uppercase tracking-[0.15em] text-white/30">
                  Season {String(season).padStart(2, "0")} · {episodes.length} episodes
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          <div className="shrink-0 px-5 py-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowSeasonPicker(!showSeasonPicker)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber to-amber/60 flex items-center justify-center">
                  <span className="text-[9px] font-black text-black">S</span>
                </div>
                <span className="font-mono font-bold text-amber text-[12px]">
                  Season {String(season).padStart(2, "0")}
                </span>
                <ChevronRight className={`w-4 h-4 text-white/30 transition-transform ${showSeasonPicker ? "rotate-90" : ""}`} />
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => season > 1 && setSeason(season - 1)}
                  disabled={season <= 1}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 disabled:opacity-20 text-white/50 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSeason(season + 1)}
                  disabled={season >= totalSeasons}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 disabled:opacity-20 text-white/50 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {showSeasonPicker && (
              <div className="mt-3 flex gap-2 overflow-x-auto thin-scrollbar pb-1">
                {Array.from({ length: totalSeasons }, (_, i) => i + 1).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSeason(s);
                      setShowSeasonPicker(false);
                    }}
                    className={`shrink-0 px-4 py-2 rounded-xl text-[11px] font-mono font-bold transition-all
                      ${s === season 
                        ? "bg-amber text-black shadow-lg shadow-amber/20" 
                        : "bg-white/[0.06] text-white/40 hover:bg-white/[0.1] hover:text-white border border-white/[0.04]"}`}
                  >
                    S{String(s).padStart(2, "0")}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto thin-scrollbar px-4 py-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-amber/20 border-t-amber animate-spin" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
                  Loading…
                </span>
              </div>
            ) : episodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Film className="w-10 h-10 text-white/10" />
                <p className="text-[11px] font-mono text-white/20">No episodes found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {episodes.map((ep) => {
                  const active = isActiveEp(ep.number);
                  return (
                    <button
                      key={ep.id}
                      ref={active ? activeRef : null}
                      onClick={() => onSelectEpisode(season, ep.number)}
                      onMouseEnter={() => setHoveredEp(ep.number)}
                      onMouseLeave={() => setHoveredEp(null)}
                      className={`group w-full text-left rounded-2xl overflow-hidden transition-all duration-200
                        ${active
                          ? "bg-gradient-to-r from-amber/20 to-amber/5 border border-amber/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.04] hover:border-white/[0.08]"
                        }`}
                    >
                      <div className="flex items-center gap-3 p-2.5">
                        <div className="relative w-[88px] h-[50px] rounded-xl overflow-hidden shrink-0 bg-white/[0.05] border border-white/[0.06]">
                          {ep.still ? (
                            <img src={ep.still} alt="" className="w-full h-full object-cover" />
                          ) : poster ? (
                            <img src={poster} alt="" className="w-full h-full object-cover opacity-40" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-5 h-5 text-white/10" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          {active && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full bg-amber flex items-center justify-center shadow-lg shadow-amber/50">
                                <Play className="w-3 h-3 fill-black text-black ml-0.5" />
                              </div>
                            </div>
                          )}
                          {hoveredEp === ep.number && !active && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <Play className="w-5 h-5 text-white" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 py-0.5">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-mono font-black text-[11px] ${active ? "text-amber" : "text-white/30"}`}>
                              {String(ep.number).padStart(2, "0")}
                            </span>
                            <h3 className={`font-bold truncate text-[12px] leading-tight ${active ? "text-white" : "text-white/60"}`}>
                              {ep.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-white/25">
                              <Clock className="w-3 h-3" />
                              <span className="font-mono text-[10px]">
                                {ep.runtime ? `${ep.runtime}m` : "--"}
                              </span>
                            </div>
                            {active && (
                              <span className="ml-auto text-[9px] font-black text-amber uppercase tracking-[0.1em] bg-amber/10 px-2 py-0.5 rounded-full">
                                Playing
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-white/[0.06] px-5 py-3 bg-black/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-white/25 uppercase tracking-[0.1em]">
                {episodes.length} Episodes
              </span>
              <span className="text-[11px] font-mono text-amber/70 font-bold tracking-wider">
                S{String(season).padStart(2, "0")}E{String(currentEpisode).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
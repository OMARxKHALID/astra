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
  // [Note] totalSeasons: prop takes priority; season_number from meta is the current season, not the total
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
      block: "center",
    });
  }, [currentEpisode, season]);

  const handlePrevSeason = () => {
    if (season > 1) setSeason((s) => s - 1);
  };

  const handleNextSeason = () => {
    setSeason((s) => s + 1);
  };

  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-end pr-4">
      <div className="glass-card w-[380px] max-h-[85vh] flex flex-col pointer-events-auto animate-slideUp">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-bright">
              Episodes
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-dim hover:text-bright transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevSeason}
              disabled={season <= 1}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-dim hover:text-bright transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex-1 text-center">
              <span className="text-sm font-semibold text-bright">Season {season}</span>
            </div>

            <button
              onClick={handleNextSeason}
              disabled={season >= totalSeasons}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-dim hover:text-bright transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {seasonMeta?.overview && (
            <p className="text-subtle text-xs mt-3 line-clamp-2 leading-relaxed">
              {seasonMeta.overview}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto thin-scrollbar p-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-6 h-6 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
              <span className="text-subtle text-xs">Loading episodes...</span>
            </div>
          )}

          {!loading && episodes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-subtle text-sm">No episodes found</p>
            </div>
          )}

          {!loading &&
            episodes.map((ep) => {
              const isActive =
                ep.number === Number(currentEpisode) &&
                season === Number(currentSeason);

              return (
                <button
                  key={ep.id}
                  ref={isActive ? activeRef : null}
                  onClick={() => onSelectEpisode(season, ep.number)}
                  className={`w-full text-left rounded-xl overflow-hidden mb-3 last:mb-0 transition-all duration-300 group ${
                    isActive
                      ? "ring-2 ring-amber ring-offset-2 ring-offset-panel"
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="relative aspect-video">
                    <Image
                      src={ep.still || "/placeholder.jpg"}
                      alt=""
                      fill
                      className="object-cover"
                    />

                    <div className={`absolute inset-0 transition-colors duration-300 ${
                      isActive 
                        ? "bg-gradient-to-t from-void via-void/60 to-transparent" 
                        : "bg-gradient-to-t from-black/80 via-black/40 to-transparent group-hover:from-black/80 group-hover:via-black/60"
                    }`} />

                    {isActive && (
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1.5 bg-amber text-void text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                          <Play className="w-3 h-3" fill="currentColor" />
                          Playing
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-0 p-4 flex flex-col justify-end">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-bright font-semibold text-sm truncate">
                            {ep.number}. {ep.name}
                          </h3>
                          {ep.runtime && (
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3 text-subtle" />
                              <span className="text-dim text-xs">{ep.runtime}m</span>
                            </div>
                          )}
                        </div>

                        {!isActive && (
                          <div className="w-8 h-8 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="w-3 h-3 text-bright" fill="currentColor" />
                          </div>
                        )}
                      </div>

                      {isActive && ep.overview && (
                        <p className="text-dim text-xs line-clamp-2 mt-2 leading-relaxed">
                          {ep.overview}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-subtle">
            <span>{episodes.length} episodes</span>
            <span>Season {season} of {totalSeasons || "?"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

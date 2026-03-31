"use client";

import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, X, Play } from "lucide-react";
import Image from "next/image";
import Loading from "@/components/Loading";

export default function EpisodeSelector({
  tmdbId,
  currentSeason,
  currentEpisode,
  totalSeasons = null,
  onSelectEpisode,
  onClose,
  cache = {},
  setCache,
}) {
  const [season, setSeason] = useState(Number(currentSeason) || 1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const scrollRef = useRef(null);

  useEffect(() => {
    if (currentSeason) setSeason(Number(currentSeason));
  }, [currentSeason]);

  const episodes = cache[season]?.episodes || [];
  const seasonMeta = cache[season]?.meta || null;

  useEffect(() => {
    if (!tmdbId || cache[season]) return;

    setLoading(true);
    fetch(`/api/tmdb/tv/${tmdbId}/season/${season}`)
      .then((r) => r.json())
      .then((d) => {
        const eps = d.episodes || [];
        setCache?.((prev) => ({
          ...prev,
          [season]: { episodes: eps, meta: d },
        }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tmdbId, season]);

  useEffect(() => {
    if (!loading && episodes.length > 0) {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, episodes.length]);

  const filteredEpisodes = episodes.filter(
    (ep) =>
      ep.name.toLowerCase().includes(search.toLowerCase()) ||
      String(ep.number).includes(search),
  );

  return (
    <div className="absolute top-20 right-4 bottom-24 w-[340px] max-w-[calc(100vw-32px)] glass-card bg-void/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] flex flex-col z-[100] animate-in fade-in zoom-in-95 slide-in-from-right-4 duration-500 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] overflow-hidden">
      <div className="flex items-center gap-2 p-4 pb-2 shrink-0">
        <div className="flex-1 relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 group-focus-within:text-amber transition-colors" />
          <input
            type="text"
            placeholder="Search episodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 outline-none focus:border-white/20 focus:bg-white/10 transition-all font-body"
          />
        </div>

        <div className="relative group/s">
          <button className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 flex items-center gap-2 text-[10px] font-black text-white transition-all active:scale-95">
            S{season}
            <ChevronDown className="w-3 h-3 text-white/40" />
          </button>
          <div className="absolute top-full right-0 mt-2 w-32 py-2 rounded-2xl bg-void/95 backdrop-blur-3xl border border-white/10 shadow-2xl opacity-0 invisible group-hover/s:opacity-100 group-hover/s:visible transition-all z-50 transform origin-top-right scale-95 group-hover/s:scale-100">
            <div className="px-3 py-1 mb-1 text-[8px] font-black text-white/30 uppercase tracking-widest font-mono">
              Select Season
            </div>
            <div className="max-h-[200px] overflow-y-auto thin-scrollbar px-1">
              {[
                ...Array(
                  totalSeasons ||
                    Math.max(season, Object.keys(cache).length, 1),
                ),
              ].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setSeason(i + 1)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${season === i + 1 ? "bg-amber text-void" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
                >
                  Season {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/40 hover:text-white transition-all active:scale-95 shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto thin-scrollbar px-6 pb-6 pt-2">
        <div className="text-center mb-8 px-2">
          <h2 className="text-xl font-black text-white mb-2 font-display">
            Season {season}
          </h2>
          {seasonMeta?.overview && (
            <p className="text-[11px] text-white/50 leading-relaxed font-body max-w-sm mx-auto">
              {seasonMeta.overview}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-50">
            <Loading size="sm" full={false} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
              Fetching episodes
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {filteredEpisodes.map((ep) => {
              const isWatching =
                Number(currentEpisode) === ep.number &&
                Number(currentSeason) === season;

              return (
                <button
                  key={ep.id}
                  ref={isWatching ? scrollRef : null}
                  onClick={() =>
                    !isWatching && onSelectEpisode(season, ep.number)
                  }
                  className="group/item relative flex flex-col items-center flex-shrink-0 transition-transform active:scale-95"
                >
                  <div
                    className={`relative w-full aspect-[16/10] rounded-[1.5rem] overflow-hidden bg-surface shadow-2xl transition-all duration-500 border-2 ${
                      isWatching
                        ? "border-white shadow-[0_0_40px_rgba(255,255,255,0.15)]"
                        : "border-transparent"
                    }`}
                  >
                    <Image
                      src={ep.still || "/placeholder.jpg"}
                      alt=""
                      fill
                      className={`object-cover transition-transform duration-700 ${isWatching ? "scale-105" : "group-hover/item:scale-110"}`}
                    />

                    <div
                      className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent ${isWatching ? "opacity-100" : "opacity-80 group-hover/item:opacity-60 transition-opacity"}`}
                    />

                    <div className="absolute inset-0 p-5 flex flex-col justify-between text-left">
                      <div>
                        {isWatching && (
                          <div className="px-2.5 py-1 rounded-full bg-amber text-void text-[10px] font-black uppercase tracking-wider shadow-lg">
                            WATCHING
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[14px] font-black text-white tracking-tight drop-shadow-lg block">
                          {ep.number}. {ep.name}
                        </span>
                        {isWatching && ep.overview && (
                          <p className="text-[10px] text-white/60 line-clamp-2 leading-relaxed mt-2 max-w-[90%]">
                            {ep.overview}
                          </p>
                        )}
                        {!isWatching && (
                          <p className="text-[10.5px] text-white/50 font-body leading-relaxed drop-shadow-md line-clamp-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {ep.overview ||
                              "No description available for this episode."}
                          </p>
                        )}
                      </div>
                    </div>

                    {!isWatching && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

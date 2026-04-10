"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Loading from "@/components/Loading";

export default function EpisodeSelector({
  tmdbId,
  currentSeason,
  currentEpisode,
  totalSeasons,
  onSelectEpisode,
  onClose,
  cache,
  setCache,
  poster,
  isRoom = false,
  bingeWatchEnabled = false,
  onToggleBingeWatch,
}) {
  const cachedData = cache[currentSeason];
  const [episodes, setEpisodes] = useState(cachedData?.episodes || []);
  const [seasonMeta, setSeasonMeta] = useState(cachedData?.meta || null);
  const [loading, setLoading] = useState(!cachedData);

  const containerRef = useRef(null);

  // Close when clicking outside of the selector area
  useEffect(() => {
    const onClickOutside = (ev) => {
      // Ignore clicks on the toggle button so its own onClick works to close it
      if (ev.target.closest?.(".episodes-toggle-btn")) {
        return;
      }
      if (containerRef.current && !containerRef.current.contains(ev.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [onClose]);

  useEffect(() => {
    if (cache[currentSeason]) {
      setEpisodes(cache[currentSeason].episodes || []);
      setSeasonMeta(cache[currentSeason].meta || null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/tmdb/tv/${tmdbId}/season/${currentSeason}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          const eps = res.data.episodes || [];
          const meta = res.data.meta || null;
          setEpisodes(eps);
          setSeasonMeta(meta);
          setCache((prev) => ({
            ...prev,
            [currentSeason]: { episodes: eps, meta },
          }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tmdbId, currentSeason, cache, setCache]);

  const seasonOptions = useMemo(() => {
    const opts = [];
    for (let i = 1; i <= (totalSeasons || 1); i++) {
      opts.push({ label: `Season ${i}`, value: i });
    }
    return opts;
  }, [totalSeasons]);

  const handleSelectEpisode = (ep) => {
    if (ep.number === currentEpisode) return;
    onSelectEpisode(currentSeason, ep.number);
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 z-[70] pointer-events-none flex justify-end">
      <div
        ref={containerRef}
        className={`w-[85vw] max-w-[420px] ${isRoom ? "h-[73vh]" : "h-[88vh]"} flex flex-col pt-[10vh] pr-6 sm:pr-12 pl-4 animate-in fade-in slide-in-from-right duration-500 pointer-events-none`}
      >
        <div className="flex flex-col items-center justify-center shrink-0 mb-8 drop-shadow-2xl px-2">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-[22px] font-display font-bold text-bright text-center tracking-tight">
              {seasonMeta?.name || `Season ${currentSeason}`}
            </h2>
          </div>
          {onToggleBingeWatch && (
            <div className="flex items-center gap-2 mt-4 pointer-events-auto">
              <span className="text-[10px] text-white/50 font-mono uppercase tracking-wider">Auto-Next</span>
              <button
                onClick={onToggleBingeWatch}
                className={`relative w-10 h-5 rounded-full transition-all duration-300 cursor-pointer ${
                  bingeWatchEnabled ? "bg-amber" : "bg-white/20"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${
                    bingeWatchEnabled ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pr-2 flex flex-col gap-3 relative z-10 pointer-events-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loading size="sm" full={false} />
            </div>
          ) : episodes.length > 0 ? (
            episodes.map((ep) => {
              const isActive =
                Number(ep.number) === Number(currentEpisode);

              return (
                <button
                  key={ep.id}
                  onClick={() => handleSelectEpisode(ep)}
                  className={`relative overflow-hidden transition-all duration-500 text-left w-full group focus:outline-none shrink-0
                    ${
                      isActive
                        ? "rounded-[20px] min-h-[140px] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] scale-[1.02] z-10"
                        : "rounded-[16px] h-[85px] border border-white/10 hover:border-white/20 hover:scale-[1.01]"
                    }
                  `}
                >
                  {(ep.still || poster) && (
                    <Image
                      src={ep.still || poster}
                      alt={ep.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className={`object-cover absolute inset-0 z-0 transition-transform duration-700 ${isActive ? "scale-105" : "group-hover:scale-105"}`}
                    />
                  )}
                  <div
                    className={`absolute inset-0 z-0 transition-opacity duration-500 ${
                      isActive
                        ? "bg-gradient-to-t from-void via-void/40 to-transparent"
                        : "bg-void/70 group-hover:bg-void/50"
                    }`}
                  />

                  <div
                    className={`relative z-10 flex flex-col h-full justify-end ${isActive ? "p-5" : "p-4"}`}
                  >
                    <h3
                      className={`font-bold text-bright leading-snug drop-shadow-md ${isActive ? "text-[15px] mb-1.5" : "text-[12px] truncate"}`}
                    >
                      {isActive && (
                        <span className="inline-block bg-danger text-white text-[9px] font-black uppercase tracking-[0.1em] px-1.5 py-[2px] rounded-sm mr-2 align-middle">
                          Watching
                        </span>
                      )}
                      <span className="align-middle">
                        {ep.number}. {ep.name}
                      </span>
                    </h3>

                    <p
                      className={`text-[10.5px] text-white/60 font-mono drop-shadow ${isActive ? "mb-2.5" : "truncate"}`}
                    >
                      {ep.runtime ? `${ep.runtime}m left` : "TBA"}
                    </p>

                    {isActive && ep.overview && (
                      <p className="text-[11px] text-white/80 line-clamp-2 leading-relaxed drop-shadow-md pb-0.5">
                        {ep.overview}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <p className="text-center text-white/40 text-[11px] font-mono py-8 uppercase tracking-widest">
              No episodes found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

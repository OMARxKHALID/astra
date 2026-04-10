"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const listRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    const cached = cache[currentSeason];

    if (cached) {
      setEpisodes(cached.episodes || []);
      setSeasonMeta(cached.meta || null);
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
      })
      .finally(() => setLoading(false));
  }, [tmdbId, currentSeason, setCache]);

  useEffect(() => {
    const onClickOutside = (ev) => {
      if (ev.target.closest?.(".episodes-toggle-btn")) return;
      if (containerRef.current && !containerRef.current.contains(ev.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [onClose]);

  const currentIndex = episodes.findIndex(
    (ep) => Number(ep.number) === Number(currentEpisode),
  );

  const [focusedIndex, setFocusedIndex] = useState(currentIndex);

  useEffect(() => {
    setFocusedIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    const el = itemRefs.current[focusedIndex];
    if (el && listRef.current) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [focusedIndex]);

  const onWheel = useCallback(
    (e) => {
      if (!episodes.length) return;

      setFocusedIndex((prev) => {
        if (e.deltaY > 0) return Math.min(prev + 1, episodes.length - 1);
        if (e.deltaY < 0) return Math.max(prev - 1, 0);
        return prev;
      });
    },
    [episodes.length],
  );

  const handleSelectEpisode = (ep) => {
    if (ep.number === currentEpisode) return;
    onSelectEpisode(currentSeason, ep.number);
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 z-[70] flex justify-end pointer-events-none">
      <div
        ref={containerRef}
        onWheel={onWheel}
        className={`w-[85vw] max-w-[420px] ${
          isRoom ? "h-[73vh]" : "h-[88vh]"
        } flex flex-col pt-[10vh] pr-6 sm:pr-12 pl-4 animate-in fade-in slide-in-from-right duration-500 pointer-events-none`}
      >
        <div className="flex flex-col items-center justify-center shrink-0 mb-8 px-2">
          <h2 className="text-[22px] font-bold text-bright text-center">
            {seasonMeta?.name || `Season ${currentSeason}`}
          </h2>

          {onToggleBingeWatch && (
            <div className="flex items-center gap-2 mt-4 pointer-events-auto">
              <span className="text-[10px] text-white/50 uppercase">
                Auto-Next
              </span>

              <button
                onClick={onToggleBingeWatch}
                className={`relative w-10 h-5 rounded-full transition ${
                  bingeWatchEnabled ? "bg-amber" : "bg-white/20"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition ${
                    bingeWatchEnabled ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto no-scrollbar pr-2 pointer-events-auto pb-20"
        >
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loading size="sm" full={false} />
            </div>
          ) : episodes.length ? (
            <div className="max-w-[280px] mx-auto flex flex-col gap-4">
              {episodes.map((ep, idx) => {
                const isActive = idx === focusedIndex;
                const stackPosition = idx - focusedIndex;

                return (
                  <button
                    ref={(el) => (itemRefs.current[idx] = el)}
                    key={ep.id}
                    onClick={() => handleSelectEpisode(ep)}
                    className={`relative overflow-hidden w-full rounded-[16px] border border-white/10 transition-all duration-500 ${
                      isActive ? "min-h-[140px]" : "h-[85px]"
                    }`}
                    style={{
                      zIndex: 100 - Math.abs(stackPosition),
                      transform: `translateY(${
                        stackPosition * -15
                      }px) scale(${1 - Math.abs(stackPosition) * 0.05})`,
                      opacity: Math.max(
                        0.2,
                        1 - Math.abs(stackPosition) * 0.35,
                      ),
                    }}
                  >
                    {(ep.still || poster) && (
                      <Image
                        src={ep.still || poster}
                        alt={ep.name}
                        fill
                        sizes="280px"
                        className="object-cover absolute inset-0"
                      />
                    )}

                    <div className="absolute inset-0 bg-void/70" />

                    <div className="relative z-10 flex flex-col justify-end h-full p-4">
                      <h3 className="font-bold text-bright truncate text-[12px]">
                        {isActive && (
                          <span className="bg-danger text-white text-[9px] px-1.5 py-[2px] rounded mr-2">
                            Watching
                          </span>
                        )}
                        {ep.number}. {ep.name}
                      </h3>

                      <p className="text-[10px] text-white/50 font-mono">
                        {ep.runtime ? `${ep.runtime}m` : "TBA"}
                      </p>

                      {isActive && ep.overview && (
                        <p className="text-[11px] text-white/70 line-clamp-2 mt-1">
                          {ep.overview}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-white/40 text-[11px] uppercase">
              No episodes found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

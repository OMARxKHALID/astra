"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Clock } from "lucide-react";
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

  const [isFs, setIsFs] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const check = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", check);
    check();
    return () => document.removeEventListener("fullscreenchange", check);
  }, []);

  const handlePrevSeason = () => {
    if (season > 1) setSeason((s) => s - 1);
  };
  const handleNextSeason = () => {
    setSeason((s) => s + 1);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-void/40 backdrop-blur-sm z-40 pointer-events-auto"
        onClick={onClose}
      />
      <div
        className="fixed inset-0 z-50 pointer-events-none flex items-center justify-end"
      >
        <div
          className={`glass-card flex flex-col pointer-events-auto animate-in fade-in slide-in-from-right-4 duration-500 shadow-[0_50px_150px_rgba(0,0,0,0.7)] relative overflow-hidden bg-void/90 border border-white/5
          ${isFs ? "w-[660px] h-[90dvh] mr-4" : "w-[320px] max-h-[560px] mr-4 mt-4 rounded-2xl"}`}
        >
          <div
            className={`shrink-0 z-10 ${isFs ? "px-10 pt-10 pb-6" : "px-3 pt-3.5 pb-2"}`}
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <h2
                className={`font-black text-white/90 font-body uppercase tracking-[0.25em] ${isFs ? "text-[22px]" : "text-[11px]"}`}
              >
                Watch List
              </h2>
              <Button
                variant="custom"
                onClick={onClose}
                className={`${isFs ? "w-14 h-14 !rounded-3xl" : "w-6 h-6 !rounded-xl"} !bg-white/10 hover:!bg-white/20 flex items-center justify-center !text-white/60 hover:!text-white transition-all !border !border-white/10 active:scale-95 !p-0`}
              >
                <X className={`${isFs ? "w-8 h-8" : "w-3 h-3"}`} />
              </Button>
            </div>

            <div
              className={`${isFs ? "gap-4 p-2 rounded-3xl" : "gap-1 p-0.5 rounded-xl"} flex items-center bg-white/5 border border-white/5 shadow-inner`}
            >
              <Button
                variant="custom"
                onClick={handlePrevSeason}
                disabled={season <= 1}
                className={`${isFs ? "w-14 h-14 !rounded-2xl" : "w-6 h-6 !rounded-lg"} hover:!bg-white/10 disabled:!opacity-0 flex items-center justify-center !text-white/50 hover:!text-white transition-all !p-0 !bg-transparent !border-none`}
              >
                <ChevronLeft className={`${isFs ? "w-6 h-6" : "w-3 h-3"}`} />
              </Button>
              <div className="flex-1 text-center font-mono">
                <span
                  className={`font-black text-amber uppercase tracking-[0.3em] ${isFs ? "text-[20px]" : "text-[9px]"}`}
                >
                  S{String(season).padStart(2, "0")}
                </span>
              </div>
              <Button
                variant="custom"
                onClick={handleNextSeason}
                disabled={season >= totalSeasons}
                className={`${isFs ? "w-14 h-14 !rounded-2xl" : "w-6 h-6 !rounded-lg"} hover:!bg-white/10 disabled:!opacity-0 flex items-center justify-center !text-white/50 hover:!text-white transition-all !p-0 !bg-transparent !border-none`}
              >
                <ChevronRight className={`${isFs ? "w-6 h-6" : "w-3 h-3"}`} />
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar px-2 pb-2 relative z-10 scroll-smooth">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-amber/20 border-t-amber rounded-full animate-spin" />
                </div>
                <span className="text-[8px] uppercase font-bold tracking-[0.2em] text-white/40">
                  Syncing...
                </span>
              </div>
            ) : (
              <div className="space-y-1 pt-1">
                {episodes.map((ep) => {
                  const isActive =
                    ep.number === Number(currentEpisode) &&
                    season === Number(currentSeason);
                  return (
                    <Button
                      key={ep.id}
                      variant="custom"
                      ref={isActive ? activeRef : null}
                      onClick={() => onSelectEpisode(season, ep.number)}
                      className={`!w-full group relative flex flex-col text-left transition-all duration-300 !rounded-xl overflow-hidden !border ${
                        isFs ? "!p-1.5" : ""
                      } ${
                        isActive
                          ? "!bg-amber/15 !border-amber/40 shadow-inner ring-1 ring-amber/30"
                          : "!bg-white/5 !border-white/10 hover:!bg-white/10"
                      }`}
                    >
                      <div
                        className={`${isFs ? "gap-8 p-5" : "gap-3 p-2"} flex tracking-tight`}
                      >
                        <div
                          className={`relative rounded-xl overflow-hidden shrink-0 shadow-2xl transition-all border border-white/5 ${isFs ? "w-48 h-28" : "w-14 h-8"}`}
                        >
                          <img
                            src={ep.still || "/placeholder.jpg"}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-void/40" />
                          {isActive && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div
                                className={`rounded-full bg-amber shadow-[0_0_16px_rgba(245,158,11,0.95)] animate-pulse ${isFs ? "w-6 h-6" : "w-1.5 h-1.5"}`}
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 pr-2 py-2">
                          <div
                            className={`flex items-center gap-3 ${isFs ? "mb-3" : "mb-1"}`}
                          >
                            <span
                              className={`font-mono font-black ${isFs ? "text-[18px]" : "text-[8px]"} ${isActive ? "text-amber" : "text-white/20"}`}
                            >
                              {String(ep.number).padStart(2, "0")}
                            </span>
                            <h3
                              className={`font-bold truncate leading-none ${isFs ? "text-[26px]" : "text-[11.5px]"} ${isActive ? "text-white" : "text-white/70"}`}
                            >
                              {ep.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-4 opacity-60">
                            <Clock
                              className={`${isFs ? "w-6 h-6" : "w-2.5 h-2.5"} text-white/30`}
                            />
                            <span
                              className={`font-mono text-white/40 ${isFs ? "text-[16px]" : "text-[8px]"}`}
                            >
                              {ep.runtime || "??"}m
                            </span>
                            {isActive && (
                              <span
                                className={`ml-auto font-black text-amber uppercase tracking-[0.3em] ${isFs ? "text-[14px]" : "text-[7px]"}`}
                              >
                                Active
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isActive && ep.overview && (
                        <div
                          className={`border-amber/10 mx-3 mb-3 opacity-90 overflow-hidden ${isFs ? "px-10 pb-10 border-t pt-6" : "px-2.5 pb-2.5 border-t pt-1.5"}`}
                        >
                          <p
                            className={`text-white/50 line-clamp-3 leading-snug italic font-body ${isFs ? "text-[20px]" : "text-[9px]"}`}
                          >
                            {ep.overview}
                          </p>
                        </div>
                      )}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className={`shrink-0 border-t border-white/5 bg-void relative z-20 ${isFs ? "px-10 py-8" : "px-3.5 py-2.5"}`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`font-black text-white/20 uppercase tracking-[0.25em] ${isFs ? "text-[18px]" : "text-[8px]"}`}
              >
                {episodes.length} Episodes
              </span>
              <span
                className={`font-mono text-white/40 font-bold tracking-widest ${isFs ? "text-[18px]" : "text-[8px]"}`}
              >
                S{String(season).padStart(2, "0")} E
                {String(currentEpisode).padStart(2, "0")}
              </span>
            </div>
          </div>
          <div className="absolute -bottom-24 -left-20 w-64 h-64 bg-amber/5 blur-[100px] pointer-events-none rounded-full z-0" />
        </div>
      </div>
    </>
  );
}

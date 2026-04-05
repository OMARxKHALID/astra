"use client";

import { Star, Users, Loader2, Cloud, List as ListIcon } from "lucide-react";
import Image from "next/image";
import BackButton from "@/components/ui/BackButton";
import Button from "@/components/ui/Button";
import { serverOptions, detectServer } from "@/lib/videoResolver";

/**
 * WatchHeader: The floating top-bar for the Watch page. 
 * Orchestrates room creation, server switching, and episode navigation.
 */
export default function WatchHeader({
  visible,
  meta,
  creating,
  onSync,
  cloudOpen,
  setCloudOpen,
  episodesOpen,
  onToggleEpisodes,
  isActiveTv,
  url,
  onServerChange
}) {
  const genres = (meta?.genres || []).slice(0, 3);

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[70] px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-b from-black/95 via-black/50 to-transparent flex items-center gap-2 sm:gap-3 transition-all duration-500 transform ${
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <BackButton href="/" />

      {meta && (
        <div className="flex items-center gap-2.5 sm:gap-3 ml-1 sm:ml-2 animate-in fade-in slide-in-from-top-2 duration-700 min-w-0">
          {meta.poster && (
            <Image
              src={meta.poster}
              alt=""
              width={28}
              height={40}
              className="w-7 sm:w-8 h-10 sm:h-11 object-cover rounded-md shadow-2xl border border-white/10 shrink-0"
            />
          )}
          <div className="flex flex-col justify-center min-w-0">
            <p className="text-[13px] sm:text-[14px] font-black text-bright font-display leading-tight tracking-tight truncate">
              {meta.title}
            </p>
            <div className="hidden sm:flex gap-2 items-center mt-0.5">
              {meta.rating && (
                <span className="text-[10px] text-amber font-mono flex items-center gap-1 font-black">
                  <Star className="w-2.5 h-2.5 fill-amber" /> {meta.rating}
                </span>
              )}
              {meta.year && (
                <span className="text-[10px] text-white/40 font-mono font-bold">
                  {meta.year}
                </span>
              )}
              <div className="flex gap-2">
                {genres.map((g) => (
                  <span
                    key={g}
                    className="text-[9px] text-white/30 font-mono uppercase tracking-[0.1em] font-black"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1" />

      <div className="flex items-stretch border border-amber/20 rounded-[var(--radius-pill)] bg-amber/5 backdrop-blur-xl transition-all shadow-2xl hover:border-amber/40 hover:bg-amber/10 shrink-0 overflow-hidden">
        <Button
          variant="custom"
          disabled={creating}
          onClick={onSync}
          loading={creating}
          className="!flex items-center justify-center gap-2 px-3 sm:px-5 h-9 !text-amber !bg-transparent !border-none !rounded-none !rounded-l-[var(--radius-pill)] font-body text-[12px] font-bold active:scale-[0.98] transition-all"
        >
          {!creating && <Users className="w-4 h-4" />}
          <span className="hidden sm:inline">Astra Sync</span>
        </Button>

        <div className="relative flex items-stretch pointer-events-auto border-l border-amber/10">
          <Button
            variant="custom"
            onClick={() => setCloudOpen(!cloudOpen)}
            className={`!px-3 sm:!px-3.5 h-9 !text-amber !bg-transparent !border-none transition-all hover:bg-white/10 flex items-center justify-center !rounded-none ${
              !isActiveTv ? "!rounded-r-[var(--radius-pill)]" : "border-r border-amber/10"
            }`}
            title="Change Server"
          >
            <Cloud className="w-4 h-4" strokeWidth={2.5} />
          </Button>

          {isActiveTv && (
            <Button
              variant="custom"
              onClick={onToggleEpisodes}
              className={`!px-3 sm:!px-3.5 h-9 !bg-transparent transition-all flex items-center justify-center !rounded-none !rounded-r-[var(--radius-pill)] ${
                episodesOpen ? "!text-amber !bg-amber/20" : "!text-amber hover:!bg-white/10"
              }`}
              title="Episodes"
            >
              <ListIcon className="w-4 h-4" strokeWidth={2.5} />
            </Button>
          )}

          {cloudOpen && (
            <div className="absolute top-full right-0 mt-3 w-52 p-2 flex flex-col gap-1 glass-card z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
              <div className="px-3 py-2 border-b border-white/5 mb-1 flex items-center justify-between">
                <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] font-mono">
                  Select Server
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-amber/20" />
              </div>

              <div className="flex flex-col gap-0.5">
                {serverOptions.map((opt) => {
                  const isActive = opt.value === detectServer(url);
                  return (
                    <Button
                      key={opt.value}
                      variant="custom"
                      onClick={() => onServerChange(opt.value)}
                      className={`w-full text-left px-3 py-2.5 !rounded-xl text-[10px] font-bold tracking-wide transition-all flex items-center justify-between group !border-none !bg-transparent ${
                        isActive
                          ? "!bg-amber/15 !text-white ring-1 ring-amber/10 shadow-inner"
                          : "!text-white/60 hover:!bg-white/10 hover:!text-white"
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isActive ? (
                        <div className="w-1.5 h-1.5 rounded-full bg-amber shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
                      ) : (
                        <div className="w-1 h-1 rounded-full bg-white/5 group-hover:bg-white/20 transition-colors" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

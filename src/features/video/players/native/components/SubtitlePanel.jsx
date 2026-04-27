"use client";

import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { localStorage } from "@/utils/localStorage";
import { LS_KEYS, MAX_RECENT_SUBS } from "@/constants/config";

export function SubtitlePanel({
  activePanel,
  setActivePanel,
  subtitleUrl,
  onSubtitleChange,
  onLoad,
  videoUrl,
  addToast,
  recentSubs,
  setRecentSubs,
  subStyle,
  setSubStyle,
  subtitleOffset,
  setSubtitleOffset,
  setShowSubtitles,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [subOptions, setSubOptions] = useState(null);
  const [searchStatus, setSearchStatus] = useState("");
  const [confirmClearSubs, setConfirmClearSubs] = useState(false);

  const getSubSrc = (u) => {
    if (!u) return "";
    try {
      // Extract file_id from full URLs like http://localhost:3000/api/subtitles/download?url=12463977
      const parsed = new URL(u, "http://localhost");
      const fileId = parsed.searchParams.get("url");
      if (fileId) return fileId;
      // For blob URLs, return as-is
      return u;
    } catch { 
      // If not a valid URL (could be a raw file_id), return as-is
      return u; 
    }
  };

  const [selectingId, setSelectingId] = useState(null);

  async function handleSearch(e) {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSubOptions(null);
    setSearchStatus("");
    try {
      const res = await fetch(
        `/api/subtitles/search?q=${encodeURIComponent(searchQuery.trim())}&url=${encodeURIComponent(videoUrl)}`,
      );
      const json = await res.json();
      if (json.success) {
        setSubOptions(json.data?.subtitles || []);
      } else {
        setSearchStatus(json.error?.message || "No results found.");
      }
    } catch (e) {
      setSearchStatus("Connection failed. Try again.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSelect(sub) {
    if (selectingId) return;
    setSelectingId(sub.id || sub.url);
    const conn = typeof navigator !== "undefined" && navigator.connection;
    if (conn && (conn.saveData || ["slow-2g", "2g"].includes(conn.effectiveType))) {
      addToast?.("Subtitles skipped — slow connection detected.", "info", 5000);
      setActivePanel(null);
      setSelectingId(null);
      return;
    }

    const fileId = String(sub.url);

    const updated = [
      { label: sub.label, url: fileId },
      ...recentSubs.filter((s) => s.url !== fileId),
    ].slice(0, MAX_RECENT_SUBS);

    setRecentSubs(updated);
    localStorage.set(LS_KEYS.recentSubs, JSON.stringify(updated));

    setActivePanel(null);
    setSubOptions(null);
    setSearchQuery("");
    setSelectingId(null);

    if (setShowSubtitles) setShowSubtitles(true);
    if (onSubtitleChange) {
      onSubtitleChange(fileId);
    } else {
      onLoad?.(videoUrl, fileId);
    }
  }

  if (!activePanel) return null;

  return (
    <div
      className={`absolute bottom-20 sm:bottom-24 left-3 right-3 sm:left-auto sm:right-6 w-auto sm:w-[360px] h-[65vh] sm:h-[480px] max-h-[520px]
        glass-card z-50 transition-all duration-200 overflow-hidden flex flex-col origin-bottom-right
        ${activePanel ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}
    >
      <div className="p-3 pb-1">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-amber-500/80" />
            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.25em]">
              Subtitles
            </h3>
          </div>
          <button
            onClick={() => setActivePanel(null)}
            aria-label="Close subtitles panel"
            className="w-7 h-7 rounded-[var(--radius-pill)] flex items-center justify-center hover:bg-white/5 text-white/20 hover:text-white transition-colors focus-visible:ring-2"
          >
            ✕
          </button>
        </div>

        <div className="bg-white/5 p-1 rounded-[var(--radius-pill)] flex relative border border-white/5">
          <div
            className="absolute top-1 bottom-1 bg-white/10 rounded-[var(--radius-pill)] transition-all duration-200"
            style={{
              left:
                activePanel === "search"
                  ? "4px"
                  : activePanel === "recent"
                    ? "calc(33.33% + 2px)"
                    : "calc(66.66% + 2px)",
              width: "calc(33.33% - 6px)",
            }}
          />
          {["search", "recent", "settings"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActivePanel(tab)}
              className={`flex-1 relative z-10 py-1.5 text-[8px] font-black uppercase tracking-[0.2em] transition-all
                ${activePanel === tab ? "text-white" : "text-white/30 hover:text-white/60"}`}
            >
              {tab === "search"
                ? "Search"
                : tab === "recent"
                  ? "Recent"
                  : "Styles"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-3 pt-2">
        {activePanel === "search" && (
          <div className="space-y-2.5">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find a track…"
                className="w-full bg-white/5 border border-white/10 rounded-[var(--radius-pill)] px-3.5 py-2 text-[10px] text-white placeholder:text-white/20 focus:border-amber-500/40 outline-none transition-all"
              />
              <button
                disabled={searching || !searchQuery.trim()}
                type="submit"
                className="absolute right-1 top-1 bottom-1 w-8 rounded-[var(--radius-pill)] bg-amber-500 text-void transition-all disabled:opacity-30 active:scale-95 flex items-center justify-center"
              >
                {searching ? (
                  <div className="w-3 h-3 border-2 border-void/30 border-t-void rounded-full animate-spin mx-auto" />
                ) : (
                  <SearchIcon className="w-3 h-3 mx-auto" strokeWidth={3} />
                )}
              </button>
            </form>
            {searchStatus && !subOptions && (
              <div className="text-center py-8 opacity-40 text-[10px] uppercase font-bold tracking-widest px-3.5 leading-relaxed">
                {searchStatus}
              </div>
            )}
            {subOptions && (
              <div className="space-y-1">
                {subOptions.length === 0 ? (
                  <div className="text-center py-12 opacity-20 text-[9px] uppercase font-bold tracking-widest">
                    No Results
                  </div>
                ) : (
                  subOptions.map((sub) => {
                    const subUrl = `${window.location.origin}/api/subtitles/download?url=${encodeURIComponent(sub.url)}`;
                    const isActive = getSubSrc(subtitleUrl) === sub.url;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => handleSelect(sub)}
                        className={`w-full min-w-0 text-left px-3 py-1.5 rounded-[var(--radius-pill)] transition-all border flex items-center justify-between overflow-hidden
                            ${
                              isActive || selectingId === (sub.id || sub.url)
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-500 font-bold"
                                : "bg-white/5 border-transparent hover:border-white/10 text-white/40 hover:text-white/80"
                            }`}
                      >
                        <span className="text-[11px] truncate min-w-0 mr-2 flex-1">
                          {sub.label}
                        </span>
                        {(isActive || selectingId === (sub.id || sub.url)) && (
                          <div className={`w-3 h-3 rounded-full shrink-0 ${selectingId === (sub.id || sub.url) ? 'border-2 border-amber-500 border-t-amber-500/20 animate-spin' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {activePanel === "recent" && (
          <div className="space-y-1">
            {recentSubs.length === 0 ? (
              <div className="text-center py-10 opacity-20 text-[9px] uppercase font-bold tracking-widest leading-loose">
                No recent subtitles.
                <br />
                Search to add one.
              </div>
            ) : (
              <>
                {recentSubs.map((sub) => {
                  const isActive = getSubSrc(subtitleUrl) === getSubSrc(sub.url);
                  return (
                    <div
                      key={sub.url}
                      className="flex items-center gap-1.5 group/sub w-full overflow-hidden"
                    >
                      <button
                        onClick={async () => {
                          if (selectingId) return;
                          setSelectingId(sub.url);
                          
                          // [Fix] Extract just the file_id from the stored URL
                          const fileId = String(sub.url).replace(/.*download\?url=/, '').split('&')[0];
                          
                          // Keep the URL as-is in recent (so it displays properly)
                          const updated = [
                            { label: sub.label, url: sub.url },
                            ...recentSubs.filter((s) => s.url !== sub.url),
                          ].slice(0, MAX_RECENT_SUBS);
                          setRecentSubs(updated);
                          localStorage.set(LS_KEYS.recentSubs, JSON.stringify(updated));
                          
                          setSelectingId(null);
                          setActivePanel(null);
                          
                          if (setShowSubtitles) setShowSubtitles(true);
                          if (onSubtitleChange) onSubtitleChange(fileId);
                          else onLoad?.(videoUrl, fileId);
                        }}
                        className={`flex-1 min-w-0 text-left px-3 py-1.5 rounded-xl transition-all border flex items-center gap-1.5 overflow-hidden
                          ${
                            isActive || selectingId === sub.url
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-500 font-bold"
                              : "bg-white/5 border-transparent hover:border-white/10 text-white/40 hover:text-white/80"
                          }`}
                      >
                        <span className="text-[11px] truncate block min-w-0 flex-1">
                          {sub.label}
                        </span>
                        {(isActive || selectingId === sub.url) && (
                          <div className={`w-3 h-3 rounded-full shrink-0 ${selectingId === sub.url ? 'border-2 border-amber-500 border-t-amber-500/20 animate-spin' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          const u = recentSubs.filter((s) => s.url !== sub.url);
                          setRecentSubs(u);
                          localStorage.set(LS_KEYS.recentSubs, JSON.stringify(u));
                        }}
                        title="Remove"
                        className="opacity-0 group-hover/sub:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-full bg-danger/10 hover:bg-danger/25 text-danger/60 hover:text-danger border border-danger/15 shrink-0 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
                {recentSubs.length > 1 && (
                  <button
                    onClick={() => {
                      if (confirmClearSubs) {
                        setRecentSubs([]);
                        localStorage.set(LS_KEYS.recentSubs, "[]");
                        setConfirmClearSubs(false);
                      } else {
                        setConfirmClearSubs(true);
                        setTimeout(() => setConfirmClearSubs(false), 3000);
                      }
                    }}
                    className="w-full mt-2 py-2 text-[9px] font-bold uppercase tracking-widest text-white/20 hover:text-danger/60 transition-colors"
                  >
                    {confirmClearSubs ? "Tap to confirm" : "Clear all"}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {activePanel === "settings" && (
          <div className="space-y-3">
            <section>
              <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mb-1.5 block ml-1">
                Scale
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[50, 75, 100, 125].map((sz) => (
                  <button
                    key={sz}
                    onClick={() =>
                      setSubStyle((s) => ({ ...s, fontSize: sz }))
                    }
                    className={`py-1 rounded-[6px] border text-[8px] font-bold transition-all
                      ${
                        subStyle.fontSize === sz
                          ? "bg-amber-500 border-amber-500 text-void shadow-lg shadow-amber-500/20"
                          : "bg-white/5 border-white/5 text-white/40 hover:text-white hover:border-white/10"
                      }`}
                  >
                    {sz}%
                  </button>
                ))}
              </div>
            </section>

            <section>
              <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mb-1.5 block ml-1">
                Color
              </label>
              <div className="bg-white/5 p-2 rounded-2xl border border-white/5 flex items-center justify-between">
                {[
                  "#ffffff",
                  "#ffee00",
                  "#00ffcc",
                  "#ff3366",
                  "#ff9900",
                  "#aaffaa",
                ].map((c) => (
                  <button
                    key={c}
                    onClick={() => setSubStyle((s) => ({ ...s, color: c }))}
                    className="p-0.5"
                  >
                    <div
                      className={`w-5 h-5 rounded-full transition-all border-2 ${subStyle.color === c ? "border-amber-500 scale-110" : "border-transparent opacity-50 hover:opacity-100"}`}
                      style={{ backgroundColor: c }}
                    />
                  </button>
                ))}
              </div>
            </section>

            <section>
              <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mb-1.5 block ml-1">
                Background
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  ["rgba(0,0,0,0)", "None"],
                  ["rgba(0,0,0,0.6)", "Box"],
                  ["rgba(0,0,0,0.85)", "Solid"],
                ].map(([bg, label]) => (
                  <button
                    key={label}
                    onClick={() =>
                      setSubStyle((s) => ({ ...s, background: bg }))
                    }
                    className={`py-1.5 rounded-lg border transition-all text-[8px] font-black uppercase tracking-widest
                      ${
                        subStyle.background === bg
                          ? "bg-amber-500 border-amber-500 text-void shadow-lg shadow-amber-500/20"
                          : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mb-1.5 block ml-1">
                Position
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  ["bottom", "Bottom"],
                  ["top", "Top"],
                ].map(([pos, label]) => (
                  <button
                    key={pos}
                    onClick={() =>
                      setSubStyle((s) => ({ ...s, position: pos }))
                    }
                    className={`py-1.5 rounded-lg border transition-all text-[8px] font-bold uppercase tracking-wider
                      ${
                        (subStyle.position || "bottom") === pos
                          ? "bg-amber-500 border-amber-500 text-void shadow-lg shadow-amber-500/20"
                          : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mb-1.5 block ml-1">
                Text shadow
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  ["none", "Off"],
                  ["soft", "Soft"],
                  ["hard", "Strong"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() =>
                      setSubStyle((s) => ({ ...s, shadow: key }))
                    }
                    className={`py-1.5 rounded-lg border transition-all text-[8px] font-bold uppercase tracking-wider
                      ${
                        (subStyle.shadow || "soft") === key
                          ? "bg-amber-500 border-amber-500 text-void shadow-lg shadow-amber-500/20"
                          : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {subtitleUrl && (
              <section className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-2.5 ml-1">
                  <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em]">
                    Timing offset
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[11px] font-mono font-bold tabular-nums ${subtitleOffset === 0 ? "text-white/25" : subtitleOffset > 0 ? "text-jade/80" : "text-danger/80"}`}
                    >
                      {subtitleOffset > 0 ? "+" : ""}
                      {subtitleOffset.toFixed(1)}s
                    </span>
                    {subtitleOffset !== 0 && (
                      <button
                        onClick={() => setSubtitleOffset(0)}
                        className="text-[9px] font-bold text-white/20 hover:text-white/60 transition-colors px-1.5 py-0.5 rounded-full hover:bg-white/5"
                      >
                        reset
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative h-6 flex items-center">
                  <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/8">
                    <div
                      className="absolute top-0 bottom-0 rounded-full bg-amber-500/60"
                      style={{
                        left:
                          subtitleOffset < 0
                            ? `${50 + (subtitleOffset / 15) * 50}%`
                            : "50%",
                        right:
                          subtitleOffset > 0
                            ? `${50 - (subtitleOffset / 15) * 50}%`
                            : "50%",
                      }}
                    />
                    <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-white/20" />
                  </div>
                  <input
                    type="range"
                    min={-15}
                    max={15}
                    step={0.1}
                    value={subtitleOffset}
                    onChange={(e) =>
                      setSubtitleOffset(Number(e.target.value))
                    }
                    className="relative w-full opacity-0 cursor-pointer h-6"
                  />
                </div>
                <div className="flex gap-1.5 mt-1">
                  {[-5, -2, -1, -0.5, +0.5, +1, +2, +5].map((v) => (
                    <button
                      key={v}
                      onClick={() =>
                        setSubtitleOffset((p) =>
                          parseFloat((p + v).toFixed(1)),
                        )
                      }
                      className="flex-1 py-1 rounded-[6px] border text-[8px] font-bold transition-all bg-white/4 border-white/8 text-white/30 hover:text-white/70 hover:bg-white/8"
                    >
                      {v > 0 ? `+${v}` : v}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-white/20 font-mono mt-2 ml-1">
                  Negative = earlier · Positive = later
                </p>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

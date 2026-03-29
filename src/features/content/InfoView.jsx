"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Play,
  Share2,
  Youtube,
  ChevronDown,
  Users,
  Check,
  Loader2,
} from "lucide-react";
import { buildEmbedUrl, serverOptions } from "@/lib/videoResolver";
import Loading from "@/components/Loading";
import { createRoom } from "@/utils/createRoom";

// [Note] Custom Select: Logic to override native <select> UI which breaks premium dark mode immersion
function CustomSelect({
  label,
  value,
  options,
  onChange,
  icon: Icon = ChevronDown,
  position = "bottom",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options?.find((opt) => opt.value === value) ||
    options?.[0] || { label: "Select...", value: "" };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-2 w-full" ref={containerRef}>
      {label && (
        <label className="text-[9px] font-black text-[var(--color-muted)] uppercase tracking-[0.2em] ml-2">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-5 h-10 rounded-[var(--radius-pill)] border transition-all duration-300 glass-card shadow-lg bg-[var(--color-surface)] hover:border-white/20 group ${
            isOpen
              ? "border-[var(--color-amber)] ring-2 ring-[var(--color-amber)]/10 shadow-[var(--color-amber)]/5 z-[50]"
              : "border-[var(--color-border)] z-[1]"
          }`}
        >
          <span className="text-[11px] lg:text-[12px] font-bold text-[var(--color-text)] truncate pr-4">
            {selectedOption.label}
          </span>
          <Icon
            className={`w-3.5 h-3.5 text-[var(--color-muted)] transition-transform duration-300 ${isOpen ? "rotate-180 text-amber-500" : "group-hover:text-amber-500"}`}
          />
        </button>

        {isOpen && (
          <div
            className={`absolute ${position === "top" ? "bottom-full mb-2" : "top-full mt-2"} left-0 right-0 z-[100] glass-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 ${position === "top" ? "slide-in-from-bottom-2" : "slide-in-from-top-2"} duration-200 p-1.5 backdrop-blur-2xl bg-[var(--color-surface)]/95`}
          >
            <div className="max-h-[240px] overflow-y-auto thin-scrollbar flex flex-col gap-0.5">
              {options.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[var(--radius-pill)] text-[11px] lg:text-[12px] font-bold transition-all duration-200 group/item ${
                    opt.value === value
                      ? "bg-amber-500 text-void shadow-lg shadow-amber-500/10"
                      : "text-[var(--color-muted)] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="truncate pr-4">{opt.label}</span>
                  {opt.value === value && (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InfoView({ initialData, type, id }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState(
    type === "tv" ? "episodes" : "overview",
  );
  const [episodes, setEpisodes] = useState(initialData?.initialEpisodes || []);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [epLoading, setEpLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [seasonCache, setSeasonCache] = useState({
    1: initialData?.initialEpisodes || [],
  });

  useEffect(() => {
    if (type !== "tv" || activeTab !== "episodes" || !id) return;

    if (seasonCache[selectedSeason]) {
      setEpisodes(seasonCache[selectedSeason]);
      return;
    }

    setEpLoading(true);
    fetch(`/api/tmdb/tv/${id}/season/${selectedSeason}`)
      .then((r) => r.json())
      .then((d) => {
        const eps = d.episodes || [];
        setEpisodes(eps);
        setSeasonCache((prev) => ({ ...prev, [selectedSeason]: eps }));
        setEpLoading(false);
      })
      .catch(() => setEpLoading(false));
  }, [id, activeTab, selectedSeason, type]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const handleWatch = () => {
    const server = serverOptions[0].value;
    const embedUrl = buildEmbedUrl(server, id, type, 1, 1);
    router.push(
      `/watch?url=${encodeURIComponent(embedUrl)}&tmdb=${id}&type=${type}`,
    );
  };

  const handleWatchTogether = async () => {
    setCreating(true);
    try {
      const server = serverOptions[0].value;
      const embedUrl = buildEmbedUrl(server, id, type, 1, 1);
      const { roomId } = await createRoom(embedUrl);
      router.push(
        `/room/${roomId}?url=${encodeURIComponent(embedUrl)}&tmdb=${id}&type=${type}`,
      );
    } catch {
      setCreating(false);
    }
  };

  if (!data?.id || data.error) {
    return (
      <div className="h-screen bg-[var(--color-void)] text-[var(--color-text)] flex flex-col items-center justify-center gap-6 animate-in fade-in duration-700">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
          <Share2 className="w-8 h-8 opacity-40 rotate-180" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold font-display text-white/90">
            Details Unavailable
          </h2>
          <p className="text-sm text-white/40 mt-1 font-mono">
            This item could not be loaded or reached TMDB.
          </p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-2.5 rounded-full bg-amber-500 text-void font-bold text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-amber-500/10 hover:bg-amber-400"
        >
          Go Home
        </button>
      </div>
    );
  }

  const genres = data?.genres ? data.genres.join(", ") : "";
  const companies = data?.companies || "";
  const languages = data?.languages || "";
  const countries = data?.countries || "";

  const seasonOptions = (data.seasons || []).map((s) => ({
    label: s.name,
    value: s.number,
  }));

  return (
    <div
      key={`${type}-${id}`}
      className="h-screen w-screen bg-[var(--color-void)] flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden font-body text-[var(--color-text)] animate-in fade-in duration-500"
    >
      {/* Left: backdrop image panel */}
      <div className="flex-[3] relative flex flex-col h-[40vh] lg:h-screen transition-all duration-1000 ease lg:pl-4">
        <div className="flex-1 relative w-full h-full lg:h-[95vh] lg:my-[2.5vh] lg:rounded-[var(--radius-panel)] bg-[var(--color-void)]">
          <div className="absolute inset-0 rounded-[var(--radius-panel)] overflow-hidden pointer-events-none">
            {data.backdrop ? (
              <Image
                src={data.backdrop}
                alt=""
                fill
                priority
                className="w-full h-full object-cover object-[center_20%] opacity-80"
              />
            ) : (
              <div className="w-full h-full bg-[var(--color-void)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-void)] via-transparent to-transparent" />
          </div>

          {/* Bottom: poster + info card */}
          <div className="absolute bottom-0 left-0 w-full p-2 lg:p-[0.5rem] flex items-end justify-start z-10">
            {/* [Note] Concave corner: left edge of backdrop at poster top */}
            <div className="absolute z-20 pointer-events-none left-0 bottom-[10.65rem] lg:bottom-[15.8rem] w-[2.2rem] h-[2.2rem] rounded-bl-[2.2rem] shadow-[-10px_10px_0_10px_var(--color-void)]" />
            {/* [Note] Concave corner: left edge of backdrop at info card top */}
            <div className="absolute z-20 pointer-events-none left-[7.85rem] lg:left-[11rem] bottom-[6.85rem] lg:bottom-[7.3rem] w-[2.2rem] h-[2.2rem] rounded-bl-[2.2rem] shadow-[-10px_10px_0_10px_var(--color-void)]" />
            {/* [Note] Concave corner: additional curve for transition */}
            <div className="absolute z-20 pointer-events-none left-0 bottom-[6.28rem] lg:bottom-[6.8rem] w-[2.2rem] h-[2.2rem] rounded-bl-[2.2rem] shadow-[-10px_10px_0_10px_var(--color-void)]" />

            {/* Poster card */}
            <div className="relative w-[7rem] lg:w-[10rem] shrink-0 outline-[0.9rem] lg:outline-[1rem] outline-[var(--color-void)] rounded-[1rem] bg-[var(--color-void)] bottom-[-0.5rem] lg:bottom-[-1rem] left-[0.2rem] lg:left-[-0.5rem] z-30 overflow-visible">
              {/* [Note] Concave corner: top-right of poster */}
              <div className="absolute z-20 top-0 left-[3.85rem] lg:left-[4.9rem] w-[1rem] lg:w-[2rem] h-[1rem] lg:h-[2rem] rounded-tr-[1rem] lg:rounded-tr-[2rem] shadow-[5px_-5px_0_5px_var(--color-void)] lg:shadow-[7px_-7px_0_7px_var(--color-void)]" />
              {/* [Note] Concave corner: right side of poster */}
              <div className="absolute z-20 top-[2.15rem] lg:top-[3.1rem] left-[6rem] lg:left-[8rem] w-[1rem] lg:w-[2rem] h-[1rem] lg:h-[2rem] rounded-tr-[1rem] lg:rounded-tr-[2rem] shadow-[5px_-5px_0_5px_var(--color-void)] lg:shadow-[7px_-7px_0_7px_var(--color-void)]" />

              <div className="w-full aspect-[2/3] rounded-[1rem] overflow-hidden relative bg-[var(--color-panel)] flex items-center justify-center border border-white/5">
                {data.poster ? (
                  <Image
                    src={data.poster}
                    alt={data.title}
                    width={240}
                    height={360}
                    className="w-full h-full object-cover"
                    priority
                  />
                ) : (
                  <span className="text-white/20 font-mono text-xs uppercase">
                    No Image
                  </span>
                )}
              </div>

              {data.rating && (
                <div className="absolute -top-[0.5rem] -right-[0.5rem] w-[2.5rem] lg:w-[3.3rem] h-[2.5rem] lg:h-[3.3rem] rounded-full bg-[var(--color-panel)] flex items-center justify-center text-amber-500 font-bold shadow-[0_4px_10px_rgba(0,0,0,0.5)] outline-[0.2rem] lg:outline-[0.5rem] outline-[var(--color-void)] z-40 font-mono text-[11px] lg:text-[1.2rem]">
                  {data.rating}
                </div>
              )}
            </div>

            {/* Info card: title + action buttons + server select */}
            <div className="relative bottom-[-2.5rem] lg:bottom-[-2.7rem] left-[0.2rem] lg:left-[0.5rem] mb-2 lg:mb-[2rem] rounded-[1.25rem] lg:rounded-[1.5rem] outline-[0.4rem] lg:outline-[0.7rem] outline-[var(--color-void)] glass-card backdrop-blur-xl bg-white/[0.02] border border-white/5 p-2 lg:p-[0.75rem] lg:pr-[1rem] min-w-[9rem] lg:min-w-[13rem] max-w-[16rem] lg:max-w-[18rem] flex flex-col gap-1 lg:gap-2 text-center z-30 shadow-2xl ml-2 lg:ml-0">
              {/* [Note] Concave corner: right edge of info card joining the void background */}
              <div className="absolute -right-[2.18rem] bottom-0 lg:bottom-[0.2rem] w-[1.5rem] h-[1.5rem] rounded-bl-[2.2rem] shadow-[-6px_6px_0_6px_var(--color-void)] z-20" />

              <div className="flex flex-col items-center gap-0.5 lg:gap-1 mb-1 lg:pr-2">
                <span className="text-[8px] lg:text-[10px] font-black text-amber-500/60 uppercase tracking-[0.2em] lg:tracking-[0.3em] select-none lg:hidden">
                  {type === "tv" ? "SHOW" : "MOVIE"}
                </span>
                <h1 className="font-display text-[0.95rem] lg:text-[1.1rem] xl:text-[1.3rem] font-bold leading-tight truncate w-full m-0 text-[var(--color-bright)] tracking-tight lg:tracking-tighter">
                  {data.title}
                </h1>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1 lg:gap-[0.5rem] w-full relative p-0.5 lg:p-1 lg:pr-[1rem]">
                <span className="absolute -right-[0.5rem] lg:-right-[1rem] top-[40%] text-[10px] lg:text-[0.7rem] font-black text-[var(--color-muted)] uppercase tracking-wider select-none origin-center rotate-90 hidden lg:block">
                  {type === "tv" ? "SHOW" : "MOVIE"}
                </span>
                <button
                  onClick={handleWatch}
                  className="bg-amber-500 text-[var(--color-void)] flex-1 min-w-[60px] sm:flex-none px-2 lg:px-[0.7rem] py-1.5 lg:py-[0.4rem] rounded-[var(--radius-pill)] text-[9px] lg:text-[13px] tracking-tighter lg:tracking-tight font-black uppercase flex items-center justify-center gap-1 cursor-pointer hover:bg-amber-400 transition-colors shadow-lg active:scale-95"
                >
                  <Play
                    size={9}
                    fill="currentColor"
                    strokeWidth={3}
                    className="lg:w-[11px] lg:h-[11px]"
                  />{" "}
                  Watch
                </button>

                <button
                  disabled={creating}
                  onClick={handleWatchTogether}
                  className="bg-jade text-[var(--color-void)] flex-1 min-w-[75px] sm:flex-none px-2 lg:px-[0.7rem] py-1.5 lg:py-[0.4rem] rounded-[var(--radius-pill)] text-[9px] lg:text-[11px] tracking-tighter lg:tracking-tight font-black uppercase flex items-center justify-center gap-1 cursor-pointer hover:bg-white transition-colors shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {creating ? (
                    <Loader2 className="w-3 h-3 lg:w-3.5 lg:h-3.5 animate-spin" />
                  ) : (
                    <Users
                      size={10}
                      fill="currentColor"
                      strokeWidth={3}
                      className="lg:w-[11px] lg:h-[11px]"
                    />
                  )}
                  Together
                </button>

                <button
                  onClick={() =>
                    data.trailer &&
                    window.open(
                      `https://www.youtube.com/watch?v=${data.trailer}`,
                      "_blank",
                    )
                  }
                  className={`bg-amber-500 text-[var(--color-void)] flex-1 min-w-[65px] sm:flex-none px-2 lg:px-[0.6rem] py-1.5 lg:py-[0.3rem] rounded-[var(--radius-pill)] text-[9px] lg:text-[11px] tracking-tighter lg:tracking-tight font-black uppercase flex items-center justify-center gap-1 cursor-pointer hover:bg-amber-400 transition-colors shadow-lg active:scale-95 ${!data.trailer ? "opacity-30 pointer-events-none" : ""}`}
                >
                  <Youtube
                    size={10}
                    fill="currentColor"
                    strokeWidth={3}
                    className="lg:w-[11px] lg:h-[11px]"
                  />{" "}
                  Trailers
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: tabs + content panel */}
      <div className="flex-[1] hover:lg:flex-[2] transition-all duration-1000 ease flex flex-col min-h-[70vh] lg:h-screen lg:min-h-0 lg:overflow-y-auto lg:thin-scrollbar bg-[var(--color-void)] py-4 lg:py-0 overflow-visible">
        <div className="flex-1 lg:h-full p-4 lg:p-6 lg:mt-[2.5vh] lg:mx-4 lg:rounded-[var(--radius-panel)]">
          {/* Tab navigation */}
          <div className="flex border-b border-white/10 mb-6">
            {(type === "tv"
              ? ["Episodes", "Overview", "Casts", "Reviews", "Related"]
              : ["Overview", "Casts", "Reviews", "Related"]
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={`flex-1 bg-none border-none pb-3 cursor-pointer text-[13px] font-semibold transition-colors duration-200 border-b-[2px] outline-none -mb-[1px] ${
                  activeTab === tab.toLowerCase()
                    ? "text-amber-500 border-amber-500"
                    : "text-[var(--color-muted)] border-transparent hover:text-[var(--color-dim)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-5">
              {data.providers?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-widest mb-3 font-mono">
                    Available On
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {data.providers.map((p) => (
                      <div
                        key={p.id}
                        className="relative group cursor-help"
                        title={p.name}
                      >
                        <Image
                          src={p.logo}
                          alt={p.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-[var(--radius-pill)] border border-white/10 shadow-lg hover:scale-110 transition-transform"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tagline + overview description */}
              <div className="flex flex-col gap-2.5">
                {data.tagline && (
                  <p className="text-[14px] lg:text-[15px] font-bold text-[var(--color-bright)] italic leading-snug">
                    &ldquo;{data.tagline}&rdquo;
                  </p>
                )}
                <p className="text-[13px] text-[var(--color-dim)] leading-[1.7]">
                  {data.overview}
                </p>
              </div>

              {/* Metadata list — clean label / value pairs, no box backgrounds */}
              <div className="flex flex-col gap-4 pt-1">
                {[
                  { label: "Release", value: data.release || data.year },
                  { label: "Runtime", value: data.runtime },
                  { label: "Genre", value: genres },
                  {
                    label: "Show Details",
                    value:
                      type === "tv" ? (
                        <div className="font-mono text-[12px] leading-relaxed text-[var(--color-dim)]">
                          Status : {data.status || "Ended"}
                          <br />
                          Total Seasons : {data.seasons?.length || 1}
                          <br />
                          Total Episodes : {data.episodes || 62}
                          <br />
                          Aired : {data.release || data.year}
                          {data.lastAirDate ? ` - ${data.lastAirDate}` : ""}
                        </div>
                      ) : null,
                  },
                  { label: "Spoken Languages", value: languages },
                  { label: "Production Countries", value: countries },
                  { label: "Production Companies", value: companies },
                ].map((item, i) =>
                  item.value ? (
                    <div key={i} className="flex flex-col gap-1">
                      <p className="text-[13px] font-bold text-[var(--color-bright)]">
                        {item.label}
                      </p>
                      {typeof item.value === "string" ? (
                        <p className="text-[13px] text-[var(--color-dim)] leading-relaxed">
                          {item.value}
                        </p>
                      ) : (
                        item.value
                      )}
                    </div>
                  ) : null,
                )}
              </div>
            </div>
          )}

          {/* Casts tab */}
          {activeTab === "casts" && (
            <div className="flex flex-col gap-3">
              {(data.credits || []).map((person) => (
                <div
                  key={person.id}
                  className="glass-card flex items-center gap-4 p-3 rounded-[var(--radius-pill)]"
                >
                  {person.poster ? (
                    <Image
                      src={person.poster}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-[var(--radius-pill)] object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-[var(--radius-pill)] bg-white/5 flex items-center justify-center text-[8px] font-mono">
                      N/A
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-[13px] font-bold text-[var(--color-bright)] line-clamp-1">
                      {person.name}
                    </h4>
                    <p className="text-[11px] text-[var(--color-dim)] line-clamp-1 font-mono">
                      {person.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reviews tab */}
          {activeTab === "reviews" && (
            <div className="flex flex-col gap-4">
              {(data.reviews || []).length > 0 ? (
                data.reviews.map((rev) => (
                  <div key={rev.id} className="glass-card p-4 rounded-[1.5rem]">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-[13px] font-bold text-amber-500">
                        {rev.author}
                      </h4>
                      {rev.rating && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-[var(--radius-pill)] font-bold font-mono">
                          {rev.rating}/10
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[var(--color-dim)] line-clamp-6 italic leading-relaxed">
                      &ldquo;{rev.content}&rdquo;
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-[var(--color-muted)] py-10 font-mono text-sm">
                  No reviews yet
                </p>
              )}
            </div>
          )}

          {/* Related tab */}
          {activeTab === "related" && (
            <div className="grid grid-cols-2 gap-3">
              {(data.related || []).map((item) => (
                <div
                  key={item.id}
                  className="cursor-pointer group"
                  onClick={() => router.push(`/info/${item.type}/${item.id}`)}
                >
                  <div className="relative aspect-[2/3] rounded-[1rem] overflow-hidden mb-2 bg-[var(--color-surface)] shadow-lg">
                    {item.poster && (
                      <Image
                        src={item.poster}
                        alt=""
                        width={200}
                        height={300}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute top-2 right-2 bg-black/60 text-amber-500 text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-md font-mono">
                      {item.rating}
                    </div>
                  </div>
                  <p className="text-[12px] font-bold text-[var(--color-text)] line-clamp-1 group-hover:text-amber-500 transition-colors">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Episodes tab */}
          {activeTab === "episodes" && (
            <div className="flex flex-col gap-4">
              {data.seasons && data.seasons.length > 1 && (
                <div className="mb-4">
                  <CustomSelect
                    label="Select Season"
                    value={selectedSeason}
                    options={seasonOptions}
                    onChange={(val) => setSelectedSeason(Number(val))}
                  />
                </div>
              )}

              {epLoading ? (
                <div className="py-20 flex justify-center">
                  <Loading full={false} size="sm" />
                </div>
              ) : episodes.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {episodes.map((ep) => (
                    <div
                      key={ep.id}
                      className="glass-card flex items-center gap-3 p-2 rounded-[1rem] hover:bg-white/[0.04] cursor-pointer transition-all active:scale-[0.98]"
                      onClick={() => {
                        const server = serverOptions[0].value;
                        let embedUrl = buildEmbedUrl(
                          server,
                          id,
                          "tv",
                          selectedSeason,
                          ep.number,
                        );

                        router.push(
                          `/watch?url=${encodeURIComponent(embedUrl)}&tmdb=${id}&type=tv&s=${selectedSeason}&e=${ep.number}`,
                        );
                      }}
                    >
                      <div className="w-20 h-12 bg-[var(--color-void)] rounded-lg overflow-hidden shrink-0 relative border border-white/5">
                        <Image
                          src={ep.still || data.poster}
                          alt=""
                          width={160}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                          <Play size={14} fill="#fff" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[12px] font-bold text-[var(--color-bright)] line-clamp-1">
                          Ep {ep.number}: {ep.name}
                        </h4>
                        <p className="text-[10px] text-[var(--color-muted)] font-mono">
                          {ep.airDate}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[var(--color-muted)] py-10 font-mono text-sm">
                  No episodes found
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

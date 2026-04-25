"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  Play,
  Share2,
  Users,
  Heart,
} from "lucide-react";
import Loading from "@/components/Loading";
import YoutubeIcon from "@/components/icons/YoutubeIcon";
import BackButton from "@/components/ui/BackButton";
import Button from "@/components/ui/Button";

import CustomSelect from "./components/CustomSelect";
import { useMediaActions } from "./hooks/useMediaActions";

export default function InfoView({ initialData, type, id }) {
  const router = useRouter();
  const { data: session } = useSession();
  const data = initialData;
  const [activeTab, setActiveTab] = useState(
    type === "tv" ? "episodes" : "overview",
  );
  const [episodes, setEpisodes] = useState(initialData?.initialEpisodes || []);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [epLoading, setEpLoading] = useState(false);
  const [seasonCache, setSeasonCache] = useState({
    1: initialData?.initialEpisodes || [],
  });

  const {
    isFavorite,
    creating,
    toggleFavorite,
    handleWatch,
    handleAstraSync
  } = useMediaActions(data, type);

  useEffect(() => {
    if (type !== "tv" || activeTab !== "episodes" || !id) return;

    // [Note] Skip fetch if we already have this season cached (includes SSR-provided data)
    if (seasonCache[selectedSeason]?.length > 0) {
      setEpisodes(seasonCache[selectedSeason]);
      setEpLoading(false);
      return;
    }

    setEpLoading(true);
    fetch(`/api/tmdb/tv/${id}/season/${selectedSeason}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          const eps = res.data.episodes || [];
          setEpisodes(eps);
          setSeasonCache((prev) => ({ ...prev, [selectedSeason]: eps }));
        }
        setEpLoading(false);
      })
      .catch(() => setEpLoading(false));
  }, [id, activeTab, selectedSeason, type]);

  if (!initialData || initialData.error) {
    return (
      <div className="h-screen bg-void text-[var(--color-text)] flex flex-col items-center justify-center gap-6 animate-in fade-in duration-700">
        <div className="w-20 h-20 rounded-full bg-danger/10 flex items-center justify-center text-danger border border-danger/20">
          <Share2 className="w-8 h-8 opacity-40 rotate-180" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold font-display text-bright">
            Details Unavailable
          </h1>
          <p className="text-sm text-muted mt-1 font-mono">
            This item could not be loaded or reached TMDB.
          </p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-2.5 rounded-[var(--radius-pill)] bg-amber text-void font-bold text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-amber/10 hover:bg-amber"
        >
          Go Home
        </button>
      </div>
    );
  }

  const genres = data?.genres || [];
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
      className="h-screen w-screen bg-void flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden font-body text-[var(--color-text)] animate-in fade-in duration-500 relative"
    >
      <BackButton
        onClick={() => router.back()}
        aria-label="Go back to previous page"
        className="absolute top-6 left-6 lg:top-8 lg:left-10 z-[100]"
      />

      <div className="flex-[3] relative z-[80] flex flex-col h-[40vh] lg:h-screen transition-all duration-1000 ease lg:pl-4">
        <div className="flex-1 relative w-full h-full lg:h-[95vh] lg:my-[2.5vh] lg:rounded-[var(--radius-panel)] bg-void">
          <div className="absolute inset-0 rounded-b-[var(--radius-panel)] lg:rounded-[var(--radius-panel)] overflow-hidden pointer-events-none">
            {data.backdrop ? (
              <Image
                src={data.backdrop}
                alt={`${data.title} backdrop`}
                fill
                priority
                sizes="100vw"
                className="w-full h-full object-cover object-[center_20%] opacity-80"
              />
            ) : (
              <div className="w-full h-full bg-void" />
            )}
          </div>
          <div className="absolute bottom-0 left-0 w-full p-2 lg:p-[0.5rem] flex items-end justify-start z-10">
            <div className="relative w-[7rem] lg:w-[10rem] shrink-0 outline-[0.9rem] lg:outline-[1rem] outline-void rounded-[1rem] bg-void bottom-[-0.5rem] lg:bottom-[-1rem] left-[0.2rem] lg:left-[-0.5rem] z-30 overflow-visible">
              <div className="w-full aspect-[2/3] rounded-[1rem] overflow-hidden relative bg-[var(--color-panel)] flex items-center justify-center border border-white/10">
                {data.poster ? (
                  <Image
                    src={data.poster}
                    alt={`${data.title} poster`}
                    width={240}
                    height={360}
                    className="w-full h-full object-cover"
                    priority
                  />
                ) : (
                  <span className="text-muted font-mono text-xs uppercase">
                    No Image
                  </span>
                )}
              </div>

              {data.rating && (
                <div className="absolute -top-[0.5rem] -right-[0.5rem] w-[2.5rem] lg:w-[3.3rem] h-[2.5rem] lg:h-[3.3rem] rounded-full bg-[var(--color-panel)] flex items-center justify-center text-amber font-bold shadow-[0_4px_10px_rgba(0,0,0,0.5)] outline-[0.2rem] lg:outline-[0.5rem] outline-void z-40 font-mono text-[11px] lg:text-[1.2rem]">
                  {data.rating}
                </div>
              )}
            </div>
            <div className="relative bottom-[-2.5rem] lg:bottom-[-2.7rem] left-[0.2rem] lg:left-[0.5rem] mb-2 lg:mb-[2rem] rounded-[1.25rem] lg:rounded-[1.5rem] outline-[0.4rem] lg:outline-[0.7rem] outline-void glass-card backdrop-blur-xl bg-white/[0.02] border border-white/10 p-2 lg:p-[0.75rem] lg:pr-[1rem] min-w-[9rem] lg:min-w-[13rem] max-w-[16rem] lg:max-w-[18rem] flex flex-col gap-1 lg:gap-2 text-center z-30 shadow-2xl ml-2 lg:ml-0">
              <div className="flex flex-col items-center gap-0.5 lg:gap-1 mb-1 lg:pr-2">
                <h1 className="font-display text-[0.95rem] lg:text-[1.1rem] xl:text-[1.3rem] font-bold leading-tight truncate w-full m-0 text-bright tracking-tight lg:tracking-tighter">
                  {data.title}
                </h1>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 w-full relative p-1.5 lg:p-2 lg:pr-[1rem]">
                <Button onClick={() => handleWatch()} className="flex-1 min-w-[70px] sm:flex-none">
                  <Play size={13} fill="currentColor" />
                  Watch
                </Button>

                <Button
                  variant="jade"
                  loading={creating}
                  disabled={creating}
                  onClick={() => handleAstraSync(1, 1, session)}
                  className="flex-1 min-w-[90px] sm:flex-none"
                >
                  {!creating && <Users size={13} fill="currentColor" />}
                  Together
                </Button>

                <Button
                  variant="ghost"
                  disabled={!data.trailer}
                  onClick={() =>
                    data.trailer &&
                    window.open(
                      `https://www.youtube.com/watch?v=${data.trailer}`,
                      "_blank",
                    )
                  }
                  className="flex-1 min-w-[80px] sm:flex-none"
                >
                  <YoutubeIcon size={16} />
                  Trailers
                </Button>

                <Button
                  variant={isFavorite ? "ghostActive" : "ghost"}
                  onClick={toggleFavorite}
                  className="flex-1 min-w-[50px] sm:flex-none"
                >
                  <Heart
                    size={13}
                    fill={isFavorite ? "currentColor" : "none"}
                    className={isFavorite ? "" : "opacity-60"}
                  />
                  <span className="hidden sm:inline">
                    {isFavorite ? "Saved" : "My List"}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="group/info flex-[1.4] hover:lg:flex-[2.5] transition-all duration-1000 ease flex flex-col min-h-[70vh] lg:h-screen lg:min-h-0 lg:overflow-y-auto no-scrollbar bg-void py-0 pb-10 lg:py-0 overflow-visible">
        <div className="flex-1 lg:h-full p-4 lg:p-6 lg:mt-[2.5vh] lg:mx-4 lg:rounded-[var(--radius-panel)] lg:pt-6 pt-[1.5rem]">
          <div className="sticky top-0 z-[60] bg-void/80 flex items-center border-b border-white/10 mb-6 pt-4 lg:pt-6 -mt-0 lg:-mt-6 px-4 lg:px-6 -mx-4 lg:-mx-6 backdrop-blur-2xl overflow-x-auto no-scrollbar scroll-smooth snap-x">
            <div className="flex items-center w-full transition-all duration-1000">
              {(type === "tv"
                ? ["Episodes", "Overview", "Casts", "Reviews", "Related"]
                : ["Overview", "Casts", "Reviews", "Related"]
              ).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={`flex-1 shrink-0 bg-none border-none pb-3 cursor-pointer text-[13px] font-semibold transition-all duration-1000 border-b-[2px] outline-none -mb-[1px] snap-start whitespace-nowrap px-1 text-center ${
                    activeTab === tab.toLowerCase()
                      ? "text-amber border-amber"
                      : "text-muted border-transparent hover:text-dim"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "overview" && (
            <div className="flex flex-col gap-5">
              {data.providers?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-3 font-mono">
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
                          alt={`${p.name} logo`}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-[var(--radius-pill)] border border-white/10 shadow-lg hover:scale-110 transition-transform"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                {data.tagline && (
                  <p className="text-[14px] lg:text-[15px] font-bold text-bright italic leading-snug">
                    &ldquo;{data.tagline}&rdquo;
                  </p>
                )}
                <p className="text-[13px] text-dim leading-[1.7]">
                  {data.overview}
                </p>
              </div>

              <div className="flex flex-col gap-4 pt-1">
                {[
                  { label: "Release", value: data.release || data.year },
                  { label: "Runtime", value: data.runtime },
                  {
                    label: "Genre",
                    value: (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {genres.map((g, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-[var(--radius-pill)] bg-white/5 border border-white/10 text-[11px] text-dim font-medium hover:bg-white/10 transition-colors cursor-default"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    ),
                  },
                  {
                    label: "Show Details",
                    value:
                      type === "tv" ? (
                        <div className="font-mono text-[12px] leading-relaxed text-dim">
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
                      <p className="text-[13px] font-bold text-bright">
                        {item.label}
                      </p>
                      {typeof item.value === "string" ? (
                        <p className="text-[13px] text-dim leading-relaxed">
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
                    <div className="w-10 h-10 rounded-[var(--radius-pill)] bg-white/10 flex items-center justify-center text-[8px] font-mono">
                      N/A
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-[13px] font-bold text-bright line-clamp-1">
                      {person.name}
                    </h4>
                    <p className="text-[11px] text-dim line-clamp-1 font-mono">
                      {person.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === "reviews" && (
            <div className="flex flex-col gap-4">
              {(data.reviews || []).length > 0 ? (
                data.reviews.map((rev) => (
                  <div key={rev.id} className="glass-card p-4 rounded-[1.5rem]">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-[13px] font-bold text-amber">
                        {rev.author}
                      </h4>
                      {rev.rating && (
                        <span className="text-[10px] bg-amber/10 text-amber px-2 py-0.5 rounded-[var(--radius-pill)] font-bold font-mono">
                          {rev.rating}/10
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-dim line-clamp-6 italic leading-relaxed">
                      &ldquo;{rev.content}&rdquo;
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted py-10 font-mono text-sm">
                  No reviews yet
                </p>
              )}
            </div>
          )}

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
                    <div className="absolute top-2 right-2 bg-void/60 text-amber text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-md font-mono">
                      {item.rating}
                    </div>
                  </div>
                  <p className="text-[12px] font-bold text-[var(--color-text)] line-clamp-1 group-hover:text-amber transition-colors">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          )}

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
                      className="glass-card flex items-center gap-3 p-2 rounded-[1rem] hover:bg-white/10 cursor-pointer transition-all active:scale-[0.98]"
                      onClick={() => handleWatch(selectedSeason, ep.number)}
                    >
                      <div className="w-20 h-12 bg-void rounded-lg overflow-hidden shrink-0 relative border border-white/10">
                        <Image
                          src={ep.still || data.poster}
                          alt=""
                          width={160}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-void/60 opacity-0 hover:opacity-100 transition-opacity">
                          <Play size={14} fill="currentColor" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[12px] font-bold text-bright line-clamp-1">
                          Ep {ep.number}: {ep.name}
                        </h4>
                        <p className="text-[10px] text-muted font-mono">
                          {ep.airDate}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted py-10 font-mono text-sm">
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

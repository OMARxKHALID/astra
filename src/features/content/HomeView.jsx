"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Search, Loader2 } from "lucide-react";
import { buildEmbedUrl } from "@/lib/videoResolver";
import Loading from "@/components/Loading";
import RecentRooms from "@/features/room/RecentRooms";
import { createRoom } from "@/utils/createRoom";

import Hero from "@/features/content/MediaHero";
import Row from "@/features/content/MediaRow";
import SearchOverlay from "@/features/content/SearchOverlay";

export default function HomeView({ initialData }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [showSearch, setShowSearch] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleNavigateToInfo = (item) => {
    if (item) router.push(`/info/${item.type || "movie"}/${item.id}`);
  };

  const handlePlay = (item) => {
    if (!item) return;
    const url = buildEmbedUrl("vidlink", item.id, item.type || "movie", 1, 1);
    router.push(
      `/watch?url=${encodeURIComponent(url)}&tmdb=${item.id}&type=${item.type || "movie"}`,
    );
  };

  useEffect(() => {
    const isDataEmpty = !initialData || !initialData.hero?.length || !initialData.trending?.length;
    if (isDataEmpty) {
      setLoading(true);
      fetch("/api/tmdb/browse")
        .then((r) => r.json())
        .then((d) => {
          setData(d);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [initialData]);

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  if (loading && !data) return <Loading />;
  if (!data) return <div className="h-screen bg-void" />;

  return (
    <div className="min-h-screen bg-void font-body text-text">
      <nav className="absolute top-0 left-0 right-0 h-[72px] flex items-center justify-between px-6 lg:px-12 z-[100] bg-gradient-to-b from-black/80 to-transparent pt-4">
        <div className="flex items-center gap-[42px]">
          <button
            onClick={() => router.push("/")}
            className="text-xl font-bold font-display text-white tracking-[0.02em] flex items-center gap-2 cursor-pointer bg-none border-none p-0"
          >
            <div className="w-6 h-6 rounded-[var(--radius-pill)] bg-gradient-to-br from-amber to-amber-600 flex items-center justify-center text-void font-black text-sm">
              W
            </div>
            WatchTogether
          </button>
        </div>

        <div className="flex items-center gap-5">
          <button
            onClick={() => setShowSearch(true)}
            className="hidden lg:flex items-center gap-2.5 px-4 h-11 rounded-[var(--radius-pill)] glass-card bg-white/5 backdrop-blur-xl border border-white/10 text-white/40 hover:bg-white/10 hover:text-white cursor-text group transition-all active:scale-95"
          >
            <Search className="w-4 h-4 group-hover:text-amber transition-colors" />
            <span className="text-sm font-medium pr-1">Search…</span>
            <kbd className="hidden sm:flex items-center justify-center bg-white/10 border border-white/20 rounded px-1.5 h-[22px] text-[10px] font-bold text-white/50 font-mono">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={() => setShowSearch(true)}
            className="lg:hidden w-10 h-10 rounded-[var(--radius-pill)] bg-surface border border-border text-white/40 flex items-center justify-center cursor-pointer hover:bg-white/10 hover:text-white transition-colors active:scale-95"
          >
            <Search className="w-4 h-4" />
          </button>

          <RecentRooms />

          <button
            disabled={creating}
            onClick={async () => {
              setCreating(true);
              try {
                const { roomId } = await createRoom("");
                router.push(`/room/${roomId}`);
              } catch {
                setCreating(false);
              }
            }}
            className="flex items-center gap-2.5 px-6 h-11 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[var(--radius-pill)] text-white/80 text-[13px] font-bold cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Create Room</span>
          </button>
        </div>
      </nav>

      <main className="pb-[120px]">
        <Hero
          items={data.hero || []}
          onPick={handleNavigateToInfo}
          onPlay={handlePlay}
        />
        <div className="mt-[-80px] relative z-10 flex flex-col gap-14">
          <Row
            title="Trending Now"
            items={data.trending || []}
            onPick={handleNavigateToInfo}
            accent="var(--color-amber)"
          />
          <Row
            title="Top Rated Movies"
            items={data.topMovies || []}
            onPick={handleNavigateToInfo}
            accent="var(--color-jade)"
          />
          <Row
            title="Popular TV Shows"
            items={data.topSeries || []}
            onPick={handleNavigateToInfo}
            accent="var(--color-amber)"
          />
          <Row
            title="Anime / Animation"
            items={data.anime || []}
            onPick={handleNavigateToInfo}
            accent="var(--color-danger)"
          />
        </div>
      </main>
      {showSearch && (
        <SearchOverlay
          onClose={() => setShowSearch(false)}
          onPick={handleNavigateToInfo}
        />
      )}
    </div>
  );
}

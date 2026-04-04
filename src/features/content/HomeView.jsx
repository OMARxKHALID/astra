"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Search } from "lucide-react";
import { buildEmbedUrl } from "@/lib/videoResolver";
import Loading from "@/components/Loading";
import RecentRooms from "@/features/room/RecentRooms";
import { persistence } from "@/utils/persistence";

import Hero from "@/features/content/MediaHero";
import Row from "@/features/content/MediaRow";
import SearchOverlay from "@/features/content/SearchOverlay";
import UserMenu from "@/components/UserMenu";

import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/Toast";
import ToastContainer from "@/components/Toast";

export default function HomeView({ initialData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toasts, addToast } = useToast();

  const [data, setData] = useState(initialData);
  useEffect(() => {
    if (searchParams.get("kicked")) {
      addToast("You were removed or the session ended", "error", 5000);
      router.replace("/");
    }
  }, [searchParams, addToast, router]);
  const [loading, setLoading] = useState(!initialData);
  const [showSearch, setShowSearch] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [watched, setWatched] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [lastWatchedTitle, setLastWatchedTitle] = useState("");

  const handleNavigateToInfo = (item) => {
    if (item) router.push(`/info/${item.type || "movie"}/${item.id}`);
  };

  const handlePlay = (item) => {
    if (!item) return;
    persistence.markAsWatched(item);
    const url = buildEmbedUrl("vidlink", item.id, item.type || "movie", 1, 1);
    router.push(
      `/watch?url=${encodeURIComponent(url)}&tmdb=${item.id}&type=${item.type || "movie"}`,
    );
  };

  useEffect(() => {
    const isDataEmpty =
      !initialData ||
      !initialData.hero?.length ||
      !initialData.trending?.length;
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

  useEffect(() => {
    setFavorites(persistence.getFavorites());
    const wList = persistence.getWatched();
    setWatched(wList);

    if (wList.length > 0) {
      const last = wList[0];
      setLastWatchedTitle(last.title);
      fetch(`/api/tmdb/recommendations?id=${last.id}&type=${last.type}`)
        .then((r) => r.json())
        .then((d) => setRecommendations((d.items || []).slice(0, 20)))
        .catch(() => {});
    }
  }, []);

  if (loading && !data) return <Loading />;
  if (!data) return <div className="h-screen bg-void" />;

  return (
    <div className="min-h-screen bg-void font-body text-text">
      <nav className="absolute top-0 left-0 right-0 h-[72px] flex items-center justify-between px-6 lg:px-12 z-[100] bg-gradient-to-b from-black/80 to-transparent pt-4">
        <div className="flex items-center gap-[42px]">
          <h1 className="m-0 p-0 leading-none">
            <button
              onClick={() => router.push("/")}
              className="text-xl font-bold font-display text-white tracking-[0.02em] flex items-center gap-2 cursor-pointer bg-none border-none p-0"
            >
              <div className="w-6 h-6 rounded-[var(--radius-pill)] bg-gradient-to-br from-amber to-amber-600 flex items-center justify-center text-void font-black text-sm">
                A
              </div>
              Astra
            </button>
          </h1>
        </div>

        <div className="flex items-center gap-5">
          <button
            onClick={() => setShowSearch(true)}
            className="hidden lg:flex items-center gap-2.5 px-4 h-9 glass-card text-white/40 hover:text-white cursor-text group transition-all active:scale-[0.98]"
          >
            <Search className="w-3.5 h-3.5 group-hover:text-amber transition-colors" />
            <span className="text-[12px] font-bold pr-1">Search…</span>
            <kbd className="hidden sm:flex items-center justify-center bg-white/10 border border-white/20 rounded px-1.5 h-[18px] text-[9px] font-black text-white/50 font-mono">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={() => setShowSearch(true)}
            className="lg:hidden w-9 h-9 rounded-full bg-surface border border-border text-white/40 flex items-center justify-center cursor-pointer hover:bg-white/10 hover:text-white transition-colors active:scale-95"
          >
            <Search className="w-4 h-4" />
          </button>

          <RecentRooms />

          <UserMenu />

          <button
            onClick={() => router.push("/create")}
            className="flex items-center gap-2 px-5 h-9 glass-card text-white/80 text-[12px] font-bold cursor-pointer hover:text-white transition-all active:scale-[0.98]"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Create Room</span>
          </button>
        </div>
      </nav>

      <main className="pb-12">
        <Hero
          items={data.hero || []}
          onPick={handleNavigateToInfo}
          onPlay={handlePlay}
        />
        <div className="mt-[-80px] relative z-10 flex flex-col gap-14">
          {recommendations.length > 0 && (
            <Row
              title={`Because you watched ${lastWatchedTitle}`}
              items={recommendations}
              onPick={handleNavigateToInfo}
              accent="var(--color-jade)"
            />
          )}
          {watched.length > 0 && (
            <Row
              title="Continue Watching"
              items={watched.slice(0, 15)}
              onPick={handleNavigateToInfo}
              accent="var(--color-jade)"
            />
          )}
          {favorites.length > 0 && (
            <Row
              title="My List"
              items={favorites}
              onPick={handleNavigateToInfo}
              accent="var(--color-danger)"
            />
          )}
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
      <ToastContainer toasts={toasts} />
    </div>
  );
}

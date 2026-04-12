"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/Toast";
import { persistence } from "@/utils/persistence";
import ToastContainer from "@/components/Toast";

import Hero from "./components/MediaHero";
import Row from "./components/MediaRow";
import SearchOverlay from "./components/SearchOverlay";
import HomeNavbar from "./components/HomeNavbar";
import { useMediaActions } from "./hooks/useMediaActions";

export default function HomeView({ initialData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { toasts, addToast } = useToast();

  const { handleWatch, handleAstraSync, creating } = useMediaActions(
    null,
    null,
    status === "loading" ? null : session,
  );

  const [showSearch, setShowSearch] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [watched, setWatched] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  const lastWatchedTitle = watched[0]?.title || "";

  useEffect(() => {
    const favs = persistence.getFavorites();
    const history = persistence.getWatched();
    setFavorites(favs);
    setWatched(history);

    if (history.length > 0) {
      const last = history[0];
      fetch(`/api/tmdb/recommendations?id=${last.id}&type=${last.type}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success) {
            setRecommendations((res.data.items || []).slice(0, 20));
          }
        })
        .catch(() => {});
    }
  }, []);

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

  const handleNavigateToInfo = (item) => {
    if (item) router.push(`/info/${item.type || "movie"}/${item.id}`);
  };

  if (!initialData) return <div className="h-screen bg-void" />;

  return (
    <div className="min-h-screen bg-void font-body text-text">
      <HomeNavbar onOpenSearch={() => setShowSearch(true)} />

      <main className="pb-12">
        <Hero
          items={initialData.hero || []}
          onPick={handleNavigateToInfo}
          onPlay={handleWatch}
          onSync={handleAstraSync}
          loading={creating}
        />
        <div className="mt-[-80px] relative z-50 flex flex-col gap-14">
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
            items={initialData.trending || []}
            onPick={handleNavigateToInfo}
            accent="var(--color-amber)"
          />
          <Row
            title="Top Rated Movies"
            items={initialData.topMovies || []}
            onPick={handleNavigateToInfo}
            accent="var(--color-jade)"
          />
          <Row
            title="Popular TV Shows"
            items={initialData.topSeries || []}
            onPick={handleNavigateToInfo}
            accent="var(--color-amber)"
          />
          <Row
            title="Anime / Animation"
            items={initialData.anime || []}
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

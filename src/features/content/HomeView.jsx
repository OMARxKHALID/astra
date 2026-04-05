"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Loading from "@/components/Loading";
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
  const { toasts, addToast } = useToast();

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [showSearch, setShowSearch] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [watched, setWatched] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [lastWatchedTitle, setLastWatchedTitle] = useState("");

  const { handleWatch, handleAstraSync, creating } = useMediaActions(null, null);

  useEffect(() => {
    if (searchParams.get("kicked")) {
      addToast("You were removed or the session ended", "error", 5000);
      router.replace("/");
    } else if (searchParams.get("expired")) {
      addToast("This room does not exist or has expired.", "error", 5000);
      router.replace("/");
    }
  }, [searchParams, addToast, router]);

  useEffect(() => {
    const isDataEmpty =
      !initialData ||
      !initialData.hero?.length ||
      !initialData.trending?.length;
    if (isDataEmpty) {
      setLoading(true);
      fetch("/api/tmdb/browse")
        .then((r) => r.json())
        .then((res) => {
          if (res.success) {
            setData(res.data);
          }
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
        .then((res) => {
          if (res.success) {
            setRecommendations((res.data.items || []).slice(0, 20));
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleNavigateToInfo = (item) => {
    if (item) router.push(`/info/${item.type || "movie"}/${item.id}`);
  };

  if (loading && !data) return <Loading />;
  if (!data) return <div className="h-screen bg-void" />;

  return (
    <div className="min-h-screen bg-void font-body text-text">
      <HomeNavbar onOpenSearch={() => setShowSearch(true)} />

      <main className="pb-12">
        <Hero
          items={data.hero || []}
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

import { extractMeta } from "@/lib/videoResolver";
import { getMovieDetails, getTVDetails } from "@/features/content/services/tmdbDetails";
import WatchContent from "./WatchContent";

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const url = sp.url || "";
  const tmdbId = sp.tmdb || "";
  const type = sp.type || "movie";

  const derived = extractMeta(url);
  const activeId = derived.id || tmdbId;
  const activeType = derived.type || type;

  if (!activeId) return { title: "Watch | Astra" };

  const data = activeType === "tv" ? await getTVDetails(activeId) : await getMovieDetails(activeId);
  return {
    title: data ? `Watching ${data.title || data.name}` : "Watch | Astra",
    description: data?.overview || "Astra is a real-time video synchronization platform for watch parties.",
    robots: { index: false }
  };
}

export default async function WatchPage({ searchParams }) {
  const sp = await searchParams;
  const url = sp.url || "";
  const tmdbId = sp.tmdb || "";
  const type = sp.type || "movie";

  const derived = extractMeta(url);
  const activeId = derived.id || tmdbId;
  const activeType = derived.type || type;

  let initialMeta = null;
  if (activeId) {
    initialMeta = activeType === "tv" ? await getTVDetails(activeId) : await getMovieDetails(activeId);
  }

  return <WatchContent initialMeta={initialMeta} />;
}

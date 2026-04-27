import { cache } from "react";
import { extractMeta } from "@/lib/videoResolver";
import { getMovieDetails, getTVDetails } from "@/features/content/services/tmdb";
import { WatchContent } from "./WatchContent";

// [Note] React cache: deduplicates getWatchMeta between generateMetadata and WatchPage within a single render pass
const getWatchMeta = cache(async (type, id) => {
  if (!id) return null;
  return type === "tv" ? await getTVDetails(id) : await getMovieDetails(id);
});

function resolveIds(sp) {
  const url = sp.url || "";
  const derived = extractMeta(url);
  return {
    activeId: derived.id || sp.tmdb || "",
    activeType: derived.type || sp.type || "movie",
  };
}

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const { activeId, activeType } = resolveIds(sp);

  if (!activeId) return { title: "Watch | Astra" };

  const data = await getWatchMeta(activeType, activeId);
  return {
    title: data ? `Watching ${data.title || data.name}` : "Watch | Astra",
    description: data?.overview || "Astra is a real-time video synchronization platform for watch parties.",
    robots: { index: false }
  };
}

export default async function WatchPage({ searchParams }) {
  const sp = await searchParams;
  const { activeId, activeType } = resolveIds(sp);

  const initialMeta = await getWatchMeta(activeType, activeId);

  return <WatchContent initialMeta={initialMeta} />;
}

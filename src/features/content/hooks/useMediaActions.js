import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { persistence } from "@/utils/persistence";
import { buildEmbedUrl, serverOptions } from "@/lib/videoResolver";
import { createRoom } from "@/features/room/services/createRoom";

function resolveMeta(itemOrSeason, maybeEpisode, data, type) {
  let activeData = data;
  let activeType = type;
  let activeSeason = 1;
  let activeEpisode = 1;

  if (itemOrSeason && typeof itemOrSeason === "object") {
    activeData = itemOrSeason;
    activeType = itemOrSeason.type || "movie";
  } else {
    activeSeason = itemOrSeason ?? 1;
    activeEpisode = maybeEpisode ?? 1;
  }

  return { activeData, activeType, activeSeason, activeEpisode };
}

export function useMediaActions(initialData = null, initialType = null, session = null) {
  const router = useRouter();
  const data = initialData;
  const type = initialType;
  const [isFavorite, setIsFavorite] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!data?.id) return;
    setIsFavorite(persistence.isFavorite(data.id, type));
  }, [data?.id, type]);

  const toggleFavorite = () => {
    if (!data) return;
    const nextFavorite = persistence.toggleFavorite(data, type);
    setIsFavorite(nextFavorite);
  };

  const handleWatch = (itemOrSeason = null, maybeEpisode = null) => {
    const { activeData, activeType, activeSeason, activeEpisode } =
      resolveMeta(itemOrSeason, maybeEpisode, data, type);

    if (!activeData?.id) return;

    try { persistence.markAsWatched(activeData, activeType); } catch {}
    const server = serverOptions[0].value;
    const embedUrl = buildEmbedUrl(server, activeData.id, activeType, activeSeason, activeEpisode);

    let path = `/watch?url=${encodeURIComponent(embedUrl)}&tmdb=${activeData.id}&type=${activeType}`;
    if (activeType === "tv") path += `&s=${activeSeason}&e=${activeEpisode}`;

    router.push(path);
  };

  const handleAstraSync = async (itemOrSeason = null, maybeEpisode = null, session = null) => {
    const { activeData, activeType, activeSeason, activeEpisode } =
      resolveMeta(itemOrSeason, maybeEpisode, data, type);

    if (!activeData?.id) return;

    setCreating(true);
    try { persistence.markAsWatched(activeData, activeType); } catch {}
    try {
      const server = serverOptions[0].value;
      const embedUrl = buildEmbedUrl(server, activeData.id, activeType, activeSeason, activeEpisode);
      const { roomId, createPromise } = createRoom(embedUrl, session);
      await createPromise;

      let path = `/room/${roomId}?url=${encodeURIComponent(embedUrl)}&tmdb=${activeData.id}&type=${activeType}`;
      if (activeType === "tv") path += `&s=${activeSeason}&e=${activeEpisode}`;

      router.push(path);
    } catch {
      setCreating(false);
    }
  };

  return {
    isFavorite,
    creating,
    toggleFavorite,
    handleWatch,
    handleAstraSync
  };
}

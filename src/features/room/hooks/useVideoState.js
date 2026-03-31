import { useMemo, useCallback, useState } from "react";
import { buildEmbedUrl } from "@/lib/videoResolver";

export function useVideoState({ videoUrl, params, roomId, router, sendRef }) {
  const [episodesOpen, setEpisodesOpen] = useState(false);
  const [seasonCache, setSeasonCache] = useState({});

  const tmdbId = params.get("tmdb") || "";
  const type = params.get("type") || "movie";
  const s = params.get("s") || 1;
  const e = params.get("e") || 1;

  const derivedMeta = useMemo(() => {
    if (!videoUrl) return { id: tmdbId, s, e, type };

    const vidlinkMatch = videoUrl.match(/\/tv\/(\d+)\/(\d+)\/(\d+)/);
    if (vidlinkMatch) {
      return {
        id: vidlinkMatch[1],
        s: vidlinkMatch[2],
        e: vidlinkMatch[3],
        type: "tv",
      };
    }

    const tmdbMatch =
      videoUrl.match(/[?&]tmdb=(\d+)/) || videoUrl.match(/\/tv\/(\d+)/);
    if (tmdbMatch) return { id: tmdbMatch[1], s, e, type: "tv" };

    return { id: tmdbId, s, e, type };
  }, [videoUrl, tmdbId, s, e, type]);

  const handleSelectEpisode = useCallback(
    (newSeason, newEpisode) => {
      const server = videoUrl.split("://")[1]?.split(".")?.[0] || "vidlink";
      const newUrl = buildEmbedUrl(
        server,
        derivedMeta.id,
        "tv",
        newSeason,
        newEpisode,
      );
      if (newUrl) {
        sendRef.current?.({
          type: "change_video",
          videoUrl: newUrl,
          subtitleUrl: "",
        });
        router.replace(
          `/room/${roomId}?url=${encodeURIComponent(newUrl)}&tmdb=${derivedMeta.id}&type=tv&s=${newSeason}&e=${newEpisode}`,
        );
        setEpisodesOpen(false);
      }
    },
    [videoUrl, derivedMeta.id, roomId, router, sendRef],
  );

  return {
    ...derivedMeta,
    videoUrl,
    episodesOpen,
    setEpisodesOpen,
    seasonCache,
    setSeasonCache,
    handleSelectEpisode,
    isActiveTv: derivedMeta.type === "tv",
  };
}

import { useState, useMemo, useCallback } from "react";
import { buildEmbedUrl } from "@/lib/videoResolver";

export function useVideoState({ videoUrl, params, roomId, router, sendRef }) {
  const [episodesOpen, setEpisodesOpen] = useState(false);
  const [seasonCache, setSeasonCache] = useState({});

  const parsed = useMemo(() => {
    const id = params?.get("tmdb") || "";
    const type = params?.get("type") || "movie";
    const s = parseInt(params?.get("s") || "1", 10);
    const e = parseInt(params?.get("e") || "1", 10);
    return { id, type, s, e };
  }, [params]);

  const isActiveTv = parsed.type === "tv" && !!parsed.id;

  const handleSelectEpisode = useCallback(
    ({ season, episode }) => {
      if (!parsed.id) return;
      const newUrl = buildEmbedUrl(
        "vidlink",
        parsed.id,
        "tv",
        season,
        episode,
      );
      if (newUrl && sendRef?.current) {
        sendRef.current({
          type: "change_video",
          videoUrl: newUrl,
          subtitleUrl: "",
        });
      }
    },
    [parsed.id, sendRef],
  );

  return {
    videoUrl,
    isActiveTv,
    episodesOpen,
    setEpisodesOpen,
    id: parsed.id,
    s: parsed.s,
    e: parsed.e,
    handleSelectEpisode,
    seasonCache,
    setSeasonCache,
  };
}

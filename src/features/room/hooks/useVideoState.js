import { useState, useMemo, useCallback } from "react";
import { buildEmbedUrl, detectServer, extractMeta } from "@/lib/videoResolver";

export function useVideoState({ videoUrl, params, sendRef, isHost }) {
  const [episodesOpen, setEpisodesOpen] = useState(false);
  const [seasonCache, setSeasonCache] = useState({});

  const parsed = useMemo(() => {
    // 1. Prioritize extracting IDs from the current room video URL
    const meta = extractMeta(videoUrl);
    if (meta.id) return meta;

    // 2. Fallback to initial browser search params (useful for direct deep links)
    const id = params?.get("tmdb") || "";
    const type = params?.get("type") || "movie";
    const s = params?.get("s") || "1";
    const e = params?.get("e") || "1";
    return { id, type, s, e };
  }, [videoUrl, params]);

  const isActiveTv = parsed.type === "tv" && !!parsed.id;

  const handleSelectEpisode = useCallback(
    ({ season, episode }) => {
      // 1. Only allow if we've identified the movie/show ID
      if (!parsed.id) return;

      // 2. We trigger the command (Server will definitively authorize since it's the source of truth)
      const server = detectServer(videoUrl) || "vidlink";
      const newUrl = buildEmbedUrl(server, parsed.id, "tv", season, episode);
      if (newUrl && sendRef?.current) {
        sendRef.current({
          type: "change_video",
          videoUrl: newUrl,
          subtitleUrl: "",
        });
      }
    },
    [parsed.id, videoUrl, sendRef],
  );

  const handleServerChange = useCallback(
    (newServer) => {
      if (!parsed.id) return;
      const newUrl = buildEmbedUrl(
        newServer,
        parsed.id,
        parsed.type,
        parsed.s,
        parsed.e,
      );
      if (newUrl && sendRef?.current) {
        sendRef.current({
          type: "change_video",
          videoUrl: newUrl,
          subtitleUrl: "",
        });
      }
    },
    [parsed.id, parsed.type, parsed.s, parsed.e, sendRef],
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
    handleServerChange,
    seasonCache,
    setSeasonCache,
  };
}

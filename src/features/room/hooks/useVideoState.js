import { useState, useMemo, useCallback } from "react";
import { buildEmbedUrl, detectServer, extractMeta } from "@/lib/videoResolver";
import { ls } from "@/utils/localStorage";
import { LS_KEYS } from "@/constants/config";

export function useVideoState({ videoUrl, params, sendRef, isHost, addToast }) {
  const [episodesOpen, setEpisodesOpen] = useState(false);
  const [seasonCache, setSeasonCache] = useState({});

  const [bingeWatchEnabled, setBingeWatchEnabled] = useState(
    () => ls.get(LS_KEYS.bingeWatch) === "1",
  );

  const parsed = useMemo(() => {
    const meta = extractMeta(videoUrl);
    if (meta.id) return meta;

    const server = detectServer(videoUrl);
    const isEmbed = !!server;

    if (!videoUrl || isEmbed) {
      const id = params?.get("tmdb") || "";
      const type = params?.get("type") || "movie";
      const s = params?.get("s") || "1";
      const e = params?.get("e") || "1";
      return { id, type, s, e };
    }

    return { id: "", type: "movie", s: "1", e: "1" };
  }, [videoUrl, params]);

  const isActiveTv = parsed.type === "tv" && !!parsed.id;

  const toggleBingeWatch = useCallback(() => {
    setBingeWatchEnabled((prev) => {
      const next = !prev;
      ls.set(LS_KEYS.bingeWatch, next ? "1" : "0");
      return next;
    });
    const current = ls.get(LS_KEYS.bingeWatch) === "1";
    if (addToast) {
      addToast(`Binge watch ${current ? "enabled" : "disabled"}`, "info");
    }
  }, [addToast]);

  const handleSelectEpisode = useCallback(
    (season, episode) => {
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

  return useMemo(
    () => ({
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
      bingeWatchEnabled,
      toggleBingeWatch,
    }),
    [
      videoUrl,
      isActiveTv,
      episodesOpen,
      parsed.id,
      parsed.s,
      parsed.e,
      handleSelectEpisode,
      handleServerChange,
      seasonCache,
      bingeWatchEnabled,
      toggleBingeWatch,
    ],
  );
}

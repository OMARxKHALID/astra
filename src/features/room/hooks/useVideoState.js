import { useState, useMemo, useCallback } from "react";
import { buildEmbedUrl, detectServer, extractMeta } from "@/lib/videoResolver";
import { useBingeWatch } from "@/features/content/hooks/useBingeWatch";
import { ls } from "@/utils/localStorage";
import { LS_KEYS } from "@/constants/config";

export function useVideoState({ videoUrl, params, sendRef, isHost, addToast }) {
  const [episodesOpen, setEpisodesOpen] = useState(false);
  const [seasonCache, setSeasonCache] = useState({});

  const [bingeWatchEnabled, toggleBingeWatch] = useBingeWatch(addToast);

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


  const handleSelectEpisode = useCallback(
    (season, episode) => {
      // [Note] Validation: ID required for episode switching
      if (!parsed.id) return;

      // [Note] Remote Dispatch: Server verifies host status before broadcasting change_video
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

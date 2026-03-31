import { useEffect, useRef } from "react";
import { ls } from "@/utils/localStorage";
import { LS_KEYS, MAX_HISTORY_ENTRIES } from "@/constants/config";

export function useMediaHistory({ roomId, videoUrl, serverState, isHost }) {
  const historySavedRef = useRef(false);

  useEffect(() => {
    if (!serverState || historySavedRef.current || !videoUrl) return;
    historySavedRef.current = true;
    try {
      const history = JSON.parse(ls.get(LS_KEYS.history) || "[]");
      const ytMatch = videoUrl.match(
        /(?:youtube\.com\/watch\?.*v=|youtu\.be\/)([A-Za-z0-9_-]{11})/,
      );
      const entry = {
        roomId,
        videoUrl,
        thumbnail: ytMatch
          ? `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`
          : null,
        title: videoUrl.replace(/^https?:\/\//, "").slice(0, 60),
        videoTS: serverState.currentTime || 0,
        lastVisited: Date.now(),
        isHost,
      };
      ls.set(
        LS_KEYS.history,
        JSON.stringify(
          [entry, ...history.filter((h) => h.roomId !== roomId)].slice(
            0,
            MAX_HISTORY_ENTRIES,
          ),
        ),
      );
    } catch {}
  }, [serverState, videoUrl, roomId, isHost]);
}

import { useEffect, useRef } from "react";
import { LS_KEYS } from "@/constants/config";
import { ls } from "@/utils/localStorage";

export default function useAutoSubtitle({
  videoUrl,
  subtitleUrl,
  onSubtitleChange,
  setShowSubtitles,
  addToast,
}) {
  const lastVideoUrlRef = useRef("");
  const setShowSubtitlesRef = useRef(setShowSubtitles);
  const addToastRef = useRef(addToast);
  const onSubtitleChangeRef = useRef(onSubtitleChange);

  useEffect(() => {
    setShowSubtitlesRef.current = setShowSubtitles;
    addToastRef.current = addToast;
    onSubtitleChangeRef.current = onSubtitleChange;
  });

  useEffect(() => {
    if (!videoUrl || subtitleUrl || videoUrl === lastVideoUrlRef.current) return;
    lastVideoUrlRef.current = videoUrl;

    let cancelled = false;
    (async () => {
      try {
        let query = null;
        try {
          const u = new URL(videoUrl);
          query = u.pathname.split("/").filter(Boolean).pop() || "";
          query = decodeURIComponent(query)
            .replace(/\.[a-z0-9]+$/i, "")
            .replace(/[_-]/g, " ")
            .trim();
          if (!query || query.length < 3) {
            const qParam =
              u.searchParams.get("q") ||
              u.searchParams.get("title") ||
              u.searchParams.get("name");
            if (qParam && qParam.length >= 3)
              query = decodeURIComponent(qParam).replace(/[_-]/g, " ").trim();
          }
        } catch {}
        if (!query || query.length < 3) return;

        const res = await fetch(
          `/api/subtitles/search?q=${encodeURIComponent(query)}&url=${encodeURIComponent(videoUrl)}`,
        );
        if (cancelled) return;
        const data = await res.json();
        if (data.subtitles?.length > 0 && onSubtitleChangeRef.current) {
          const sub = data.subtitles[0];
          const baseUrl =
            typeof window !== "undefined" ? window.location.origin : "";
          const dlUrl = `${baseUrl}/api/subtitles/download?url=${encodeURIComponent(sub.url)}`;
          onSubtitleChangeRef.current(dlUrl);
          setShowSubtitlesRef.current?.(true);
          const recentSubs = JSON.parse(ls.get(LS_KEYS.recentSubs) || "[]");
          const updated = [
            { label: sub.label, url: dlUrl },
            ...recentSubs.filter((s) => s.url !== dlUrl),
          ].slice(0, 5);
          ls.set(LS_KEYS.recentSubs, JSON.stringify(updated));
          addToastRef.current?.(`Subtitles loaded: ${sub.label}`, "success");
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [videoUrl, subtitleUrl]);
}

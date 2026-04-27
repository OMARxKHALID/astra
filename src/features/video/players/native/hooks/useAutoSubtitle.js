import { useEffect, useRef } from "react";
import { LS_KEYS } from "@/constants/config";
import { localStorage } from "@/utils/localStorage";

export function useAutoSubtitle({
  videoUrl,
  subtitleUrl,
  onSubtitleChange,
  setShowSubtitles,
}) {
  const lastVideoUrlRef = useRef("");
  const setShowSubtitlesRef = useRef(setShowSubtitles);
  const onSubtitleChangeRef = useRef(onSubtitleChange);

  useEffect(() => {
    setShowSubtitlesRef.current = setShowSubtitles;
    onSubtitleChangeRef.current = onSubtitleChange;
  });

  useEffect(() => {
    if (!videoUrl || subtitleUrl || videoUrl === lastVideoUrlRef.current) {
      return;
    }
    lastVideoUrlRef.current = videoUrl;

    try {
      const u = new URL(videoUrl);
      const proxyParams = ["url", "video", "src", "file", "path"];
      for (const param of proxyParams) {
        if (u.searchParams.has(param)) {
          return;
        }
      }
      const proxyDomains = ["proxy.valhallastream", "proxy.", "cdn.proxy", "streamproxy"];
      if (proxyDomains.some(d => u.hostname.includes(d))) {
        return;
      }
    } catch {}

    const ac = new AbortController();
    (async () => {
      try {
        let query = null;
        try {
          const u = new URL(videoUrl);
          
          const proxyParams = ["url", "video", "src", "file"];
          let innerUrl = null;
          for (const param of proxyParams) {
            const val = u.searchParams.get(param);
            if (val) {
              try {
                innerUrl = new URL(decodeURIComponent(val));
                break;
              } catch {}
            }
          }
          
          const targetUrl = innerUrl || u;
          query = targetUrl.pathname.split("/").filter(Boolean).pop() || "";
          query = decodeURIComponent(query)
            .replace(/\.[a-z0-9]+$/i, "")
            .replace(/[_-]/g, " ")
            .trim();
          
          if (!query || query.length < 3) {
            const qParam =
              targetUrl.searchParams.get("q") ||
              targetUrl.searchParams.get("title") ||
              targetUrl.searchParams.get("name");
            if (qParam && qParam.length >= 3) {
              query = decodeURIComponent(qParam).replace(/[_-]/g, " ").trim();
            }
          }
        } catch {}
        if (!query || query.length < 3) {
          return;
        }

        const res = await fetch(
          `/api/subtitles/search?q=${encodeURIComponent(query)}&url=${encodeURIComponent(videoUrl)}`,
          { signal: ac.signal },
        );
        if (ac.signal.aborted) return;
        if (!res.ok) return;
        const json = await res.json();
        const subtitles = json.success ? json.data?.subtitles : [];
        if (subtitles?.length > 0 && onSubtitleChangeRef.current) {
          const sub = subtitles[0];
          const baseUrl =
            typeof window !== "undefined" ? window.location.origin : "";
          const dlUrl = `${baseUrl}/api/subtitles/download?url=${encodeURIComponent(sub.url)}`;
          onSubtitleChangeRef.current(dlUrl);
          setShowSubtitlesRef.current?.(true);
          const recentSubs = JSON.parse(localStorage.get(LS_KEYS.recentSubs) || "[]");
          const updated = [
            { label: sub.label, url: dlUrl },
            ...recentSubs.filter((s) => s.url !== dlUrl),
          ].slice(0, 5);
          localStorage.set(LS_KEYS.recentSubs, JSON.stringify(updated));
        }
      } catch (e) {
        // non-critical — auto-subtitle failure should not crash the player
      }
    })();
    return () => {
      ac.abort();
    };
  }, [videoUrl, subtitleUrl]);
}

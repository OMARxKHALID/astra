import { useEffect, useRef, useState } from "react";

export default function useHLS(videoRef, videoUrl, sourceType, setVideoError) {
  const [hlsQuality, setHlsQuality] = useState(null);
  const hlsRef = useRef(null);
  // [Note] directFallbackRef: tracks whether we've already fallen back to v.src for this URL,
  // so we don't re-enter HLS setup after the fallback triggers a re-render.
  const directFallbackRef = useRef(false);
  const lastUrlRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || sourceType !== "hls") return;

    // [Note] Reset fallback flag when URL changes so new URLs always get a fresh HLS attempt
    if (lastUrlRef.current !== videoUrl) {
      directFallbackRef.current = false;
      lastUrlRef.current = videoUrl;
    }

    // Already fell back to direct src for this URL — native video element handles playback
    if (directFallbackRef.current) return;

    // Avoid redundant re-loads if URL hasn't changed
    if (v.dataset.lastHlsUrl === videoUrl) return;

    let hls;
    (async () => {
      try {
        const Hls = (await import("hls.js")).default;
        if (!Hls.isSupported()) {
          // [Note] Safari with native HLS: set src directly, browser handles M3U8 natively
          v.src = videoUrl;
          v.dataset.lastHlsUrl = videoUrl;
          return;
        }

        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
        });
        hlsRef.current = hls;

        hls.loadSource(videoUrl);
        hls.attachMedia(v);
        v.dataset.lastHlsUrl = videoUrl;

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          const level = hls.levels[data.level];
          if (level) {
            const h = level.height ? `${level.height}p` : "";
            const kbps = level.bitrate ? level.bitrate / 1000 : 0;
            const bps = kbps
              ? kbps >= 1000
                ? `${(kbps / 1000).toFixed(1)} Mbps`
                : `${kbps.toFixed(0)} Kbps`
              : "";
            setHlsQuality(h || bps ? { level: h, bitrate: bps } : null);
          }
        });

        hls.on(Hls.Events.ERROR, (_, d) => {
          if (!d.fatal) return;

          // [Note] Manifest errors mean the URL likely serves direct video (not M3U8).
          // Workers.dev proxy URLs and CDN links often fall into this case.
          // Destroy hls.js and fall back to native v.src assignment so the browser
          // can negotiate the content-type from the response headers directly.
          const isManifestError =
            d.details === Hls.ErrorDetails?.MANIFEST_PARSING_ERROR ||
            d.details === Hls.ErrorDetails?.MANIFEST_LOAD_ERROR ||
            d.details === Hls.ErrorDetails?.MANIFEST_LOAD_TIMEOUT ||
            (typeof d.details === "string" &&
              d.details.toLowerCase().includes("manifest"));

          if (isManifestError) {
            hls.destroy();
            hlsRef.current = null;
            directFallbackRef.current = true;
            // [Note] Clear lastHlsUrl so v.src assignment in useVideoEvents can proceed
            v.dataset.lastHlsUrl = "";
            v.src = videoUrl;
            v.load();
            return;
          }

          setVideoError?.({
            title: "Stream Error",
            detail: `HLS stream failed: ${d.details || d.type || "Fatal error"}.`,
          });
        });
      } catch (err) {
        console.error("[useHLS] Error loading hls.js:", err);
      }
    })();

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
        setHlsQuality(null);
      }
    };
  }, [videoUrl, sourceType, videoRef, setVideoError]);

  return { hlsQuality, hlsRef };
}

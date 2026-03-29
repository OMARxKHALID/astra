import { useEffect, useRef, useState } from "react";

export default function useHLS(videoRef, videoUrl, sourceType, setVideoError) {
  const [hlsQuality, setHlsQuality] = useState(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || sourceType !== "hls") return;

    // Avoid redundant re-loads if URL hasn't changed
    if (v.dataset.lastHlsUrl === videoUrl) return;

    let hls;
    (async () => {
      try {
        const Hls = (await import("hls.js")).default;
        if (!Hls.isSupported()) {
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
          if (d.fatal) {
            setVideoError?.({
              title: "Stream Error",
              detail: `HLS stream failed: ${d.details || d.type || "Fatal error"}.`,
            });
          }
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

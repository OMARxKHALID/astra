import { useEffect, useRef, useState } from "react";

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

export default function useHLS(videoRef, videoUrl, sourceType, setVideoError) {
  const [hlsQuality, setHlsQuality] = useState(null);
  const hlsRef = useRef(null);
  const directFallbackRef = useRef(false);
  const lastUrlRef = useRef(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || sourceType !== "hls") return;

    if (lastUrlRef.current !== videoUrl) {
      directFallbackRef.current = false;
      lastUrlRef.current = videoUrl;
      retryCountRef.current = 0;
    }

    if (directFallbackRef.current) return;
    if (v.dataset.lastHlsUrl === videoUrl) return;

    let hls;
    let cancelled = false;

    const setupHLS = async () => {
      if (cancelled) return;

      try {
        const Hls = (await import("hls.js")).default;
        if (!Hls.isSupported()) {
          v.src = videoUrl;
          v.dataset.lastHlsUrl = videoUrl;
          return;
        }

        try {
          const headRes = await fetch(videoUrl, {
            method: "HEAD",
            signal: AbortSignal.timeout(5000),
          });
          if (cancelled) return;

          const ct = headRes.headers.get("content-type") || "";
          if (ct.includes("video/mp4") || ct.includes("video/webm")) {
            directFallbackRef.current = true;
            v.dataset.lastHlsUrl = "";
            v.src = videoUrl;
            v.load();
            return;
          }
        } catch {
          // proceed to hls.js setup regardless — manifest error fallback handles misclassified URLs
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
            v.dataset.lastHlsUrl = "";
            v.src = videoUrl;
            v.load();
            return;
          }

          if (retryCountRef.current < MAX_RETRIES) {
            const attempt = retryCountRef.current;
            const delay = RETRY_DELAYS[attempt];
            retryCountRef.current++;
            retryTimerRef.current = setTimeout(() => {
              if (!cancelled) {
                hls.destroy();
                hlsRef.current = null;
                setupHLS();
              }
            }, delay);
            return;
          }

          const errorDetails = d.details || d.type || "Fatal error";
          setVideoError?.({
            title: "Stream Error",
            detail: `HLS stream failed to load. The stream format might be unsupported or restricted. (${errorDetails})`,
          });
        });
      } catch (err) {
        console.error(`[hls] Error loading hls.js: ${err.message}`);
      }
    };

    setupHLS();

    return () => {
      cancelled = true;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
        setHlsQuality(null);
      }
    };
  }, [videoUrl, sourceType, videoRef, setVideoError]);

  return { hlsQuality, hlsRef };
}

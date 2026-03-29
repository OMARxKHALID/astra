import { useEffect, useRef, useState, useCallback } from "react";

export default function useScrubPreview(
  videoUrl,
  sourceType,
  duration,
  scrubPreviewEnabled,
) {
  const [preview, setPreview] = useState(null);
  const previewVideoRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const previewImgRef = useRef(null);
  const previewDebounce = useRef(null);
  const previewSeekTime = useRef(null);

  useEffect(() => {
    if (
      !scrubPreviewEnabled ||
      sourceType === "youtube" ||
      sourceType === "vimeo" ||
      !videoUrl
    ) {
      return;
    }

    const vid = document.createElement("video");
    vid.src = videoUrl;
    vid.muted = true;
    vid.preload = "metadata";
    vid.crossOrigin = "anonymous";
    vid.style.display = "none";
    document.body.appendChild(vid);
    previewVideoRef.current = vid;

    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    previewCanvasRef.current = canvas;

    return () => {
      vid.src = "";
      vid.remove();
      previewVideoRef.current = null;
      previewCanvasRef.current = null;
      previewImgRef.current = null;
      clearTimeout(previewDebounce.current);
    };
  }, [videoUrl, sourceType, scrubPreviewEnabled]);

  const handleMouseMove = useCallback(
    (e) => {
      if (
        !scrubPreviewEnabled ||
        !duration ||
        sourceType === "youtube" ||
        sourceType === "vimeo"
      ) {
        return;
      }

      const bar = e.currentTarget;
      const rect = bar.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const pct = x / rect.width;
      const time = pct * duration;

      setPreview({ x, pct, time, img: previewImgRef.current });

      // Debounce the scrub seek to avoid performance hit
      clearTimeout(previewDebounce.current);
      previewDebounce.current = setTimeout(() => {
        const vid = previewVideoRef.current;
        const can = previewCanvasRef.current;
        if (!vid || !can) return;

        // Only seek if the difference is meaningful (> 0.5s)
        if (Math.abs((previewSeekTime.current ?? -999) - time) < 0.5) return;

        previewSeekTime.current = time;
        vid.currentTime = time;

        vid.onseeked = () => {
          try {
            const ctx = can.getContext("2d");
            ctx.drawImage(vid, 0, 0, can.width, can.height);
            previewImgRef.current = can.toDataURL("image/jpeg", 0.6);
            setPreview((p) =>
              p ? { ...p, img: previewImgRef.current } : null,
            );
          } catch {
            // If security error (likely CORS taint), disable preview silently
            previewImgRef.current = null;
          }
        };
      }, 120);
    },
    [duration, sourceType, scrubPreviewEnabled],
  );

  const handleMouseLeave = useCallback(() => {
    setPreview(null);
    clearTimeout(previewDebounce.current);
  }, []);

  return { preview, handleMouseMove, handleMouseLeave };
}

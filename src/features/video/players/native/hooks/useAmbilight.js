import { useEffect, useRef } from "react";

export function useAmbilight(videoRef, videoUrl, onAmbiColors, enabled = true) {
  const ambiRafRef = useRef(null);
  const ambiCurrentRef = useRef({ r: 0, g: 0, b: 0 });
  const ambiDisabledRef = useRef(false);

  useEffect(() => {
    // Reset state on URL change
    ambiDisabledRef.current = false;
    ambiCurrentRef.current = { r: 0, g: 0, b: 0 };
  }, [videoUrl]);

  useEffect(() => {
    if (!onAmbiColors) return;
    const v = videoRef.current;
    if (!v) return;

    // Small canvas for efficient sampling (64 total pixels)
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let lastT = 0;
    const lerp = (a, b, t) => a + (b - a) * t;

    function sample(now) {
      ambiRafRef.current = requestAnimationFrame(sample);
      if (now - lastT < 83) return; // Cap at ~12fps for performance
      lastT = now;
      if (ambiDisabledRef.current || !enabled || v.paused || v.readyState < 2) return;

      try {
        ctx.drawImage(v, 0, 0, 8, 8);
        const px = ctx.getImageData(0, 0, 8, 8).data;
        let r = 0,
          g = 0,
          b = 0;
        for (let i = 0; i < px.length; i += 4) {
          r += px[i];
          g += px[i + 1];
          b += px[i + 2];
        }
        const n = px.length / 4;
        const cur = ambiCurrentRef.current;
        const sr = lerp(cur.r, r / n, 0.18);
        const sg = lerp(cur.g, g / n, 0.18);
        const sb = lerp(cur.b, b / n, 0.18);
        ambiCurrentRef.current = { r: sr, g: sg, b: sb };

        onAmbiColors({
          r: Math.round(sr),
          g: Math.round(sg),
          b: Math.round(sb),
        });
      } catch (e) {
        if (e instanceof DOMException && e.name === "SecurityError") {
          ambiDisabledRef.current = true;
          onAmbiColors(null);
        }
      }
    }

    ambiRafRef.current = requestAnimationFrame(sample);

    return () => {
      cancelAnimationFrame(ambiRafRef.current);
      onAmbiColors?.(null);
    };
  }, [videoRef, videoUrl, onAmbiColors, enabled]);

  return { ambiDisabledRef };
}

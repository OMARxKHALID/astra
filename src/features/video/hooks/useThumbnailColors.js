import { useState, useEffect } from "react";

const colorCache = new Map();

export function useThumbnailColors(thumbnailUrl, enabled = true) {
  const [colors, setColors] = useState(null);

  useEffect(() => {
    if (!thumbnailUrl || !enabled) {
      setColors(null);
      return;
    }

    if (colorCache.has(thumbnailUrl)) {
      setColors(colorCache.get(thumbnailUrl));
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = thumbnailUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        const result = { r, g, b };
        
        // Cache the result
        if (colorCache.size > 100) colorCache.delete(colorCache.keys().next().value);
        colorCache.set(thumbnailUrl, result);
        
        setColors(result);
      } catch {
        setColors(null);
      }
    };

    img.onerror = () => setColors(null);

    return () => setColors(null);
  }, [thumbnailUrl, enabled]);

  return colors;
}

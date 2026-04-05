import { useEffect } from "react";

export function useVideoHotkeys({
  videoRef,
  handlePlayPause,
  handleFullscreen,
  onSeek,
  setMuted,
}) {
  useEffect(() => {
    const onKD = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(e.target.tagName))
        return;
      if (e.target.isContentEditable) return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          handlePlayPause?.();
          break;
        case "f":
          e.preventDefault();
          handleFullscreen?.();
          break;
        case "m":
          e.preventDefault();
          setMuted?.((m) => !m);
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          {
            const t = Math.max(0, v.currentTime - 10);
            v.currentTime = t;
            onSeek?.(t);
          }
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          {
            const t = Math.min(v.duration || Infinity, v.currentTime + 10);
            v.currentTime = t;
            onSeek?.(t);
          }
          break;
      }
    };
    window.addEventListener("keydown", onKD);
    return () => window.removeEventListener("keydown", onKD);
  }, [videoRef, handlePlayPause, handleFullscreen, onSeek, setMuted]);
}

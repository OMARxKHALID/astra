import { useEffect } from "react";
import { formatTime } from "@/utils/time";

export { formatTime };

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

let ytReady = false,
  ytCbs = [];
export function onYTReady(cb) {
  if (ytReady && window.YT?.Player) {
    cb();
    return;
  }
  ytCbs.push(cb);
  if (!document.getElementById("yt-iframe-api")) {
    const t = document.createElement("script");
    t.id = "yt-iframe-api";
    t.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(t);
  }
  window.onYouTubeIframeAPIReady = () => {
    ytReady = true;
    ytCbs.forEach((f) => f());
    ytCbs = [];
  };
}

let vmReady = false,
  vmCbs = [];
export function onVMReady(cb) {
  if (vmReady && window.Vimeo?.Player) {
    cb();
    return;
  }
  vmCbs.push(cb);
  if (!document.getElementById("vimeo-player-api")) {
    const t = document.createElement("script");
    t.id = "vimeo-player-api";
    t.src = "https://player.vimeo.com/api/player.js";
    t.onload = () => {
      vmReady = true;
      vmCbs.forEach((f) => f());
      vmCbs = [];
    };
    document.head.appendChild(t);
  }
}

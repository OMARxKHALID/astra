import { formatTime } from "@/utils/time";

export { formatTime };

let ytCbs = new Set();
export function onYTReady(cb) {
  // [Note] rely on actual API presence instead of stale ytReady flag
  if (window.YT?.Player) {
    cb();
    return;
  }
  ytCbs.add(cb);
  if (!document.getElementById("yt-iframe-api")) {
    const t = document.createElement("script");
    t.id = "yt-iframe-api";
    t.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(t);
  }

  if (!window.onYouTubeIframeAPIReady) {
    window.onYouTubeIframeAPIReady = () => {
      ytCbs.forEach((f) => f());
      ytCbs.clear();
    };
  }
}

export function cleanupYT() {
  ytCbs.clear();
}

let vmCbs = new Set();
export function onVMReady(cb) {
  if (window.Vimeo?.Player) {
    cb();
    return;
  }
  vmCbs.add(cb);
  if (!document.getElementById("vimeo-player-api")) {
    const t = document.createElement("script");
    t.id = "vimeo-player-api";
    t.src = "https://player.vimeo.com/api/player.js";
    t.onload = () => {
      vmCbs.forEach((f) => f());
      vmCbs.clear();
    };
    document.head.appendChild(t);
  }
}

export function cleanupVM() {
  vmCbs.clear();
}

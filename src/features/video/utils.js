import { formatTime } from "@/utils/time";

export { formatTime };

let ytReady = false,
  ytCbs = [];
export function onYTReady(cb) {
  // [Note] check global directly to handle manual resets or cached script cases
  if (window.YT?.Player) {
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

  if (!window.onYouTubeIframeAPIReady) {
    window.onYouTubeIframeAPIReady = () => {
      ytReady = true;
      ytCbs.forEach((f) => f());
      ytCbs = [];
    };
  }
}

let vmReady = false,
  vmCbs = [];
export function onVMReady(cb) {
  if (window.Vimeo?.Player) {
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

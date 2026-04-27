import { time } from "@/utils/time";

export { time };

let ytCbs = new Set();
let ytPollingInt = null;
export function onYTReady(cb) {
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
      if (ytPollingInt) {
        clearInterval(ytPollingInt);
        ytPollingInt = null;
      }
    };
  }

  if (!ytPollingInt && !window.YT?.Player) {
    ytPollingInt = setInterval(() => {
      if (window.YT?.Player) {
        ytCbs.forEach((f) => f());
        ytCbs.clear();
        clearInterval(ytPollingInt);
        ytPollingInt = null;
      }
    }, 100);
  }
}

export function cleanupYT() {
  ytCbs.clear();
  if (ytPollingInt) {
    clearInterval(ytPollingInt);
    ytPollingInt = null;
  }
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

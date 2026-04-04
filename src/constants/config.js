export const SYNC_CHECK_INTERVAL = 200;
export const SYNC_TOLERANCE_S = 0.5;
export const CLOCK_RECAL_INTERVAL = 30_000;

export const DEBUG = process.env.NODE_ENV !== "production";

export const HOST_RECONNECT_GRACE_MS = 6_000;
export const EMPTY_ROOM_CLEANUP_MS = 30_000;
export const SAVE_DEBOUNCE_MS = 2_000;
export const REDIS_TTL_S = 86_400;
export const JWT_EXPIRY_S = 86_400;

export const MAX_DATAURL_BYTES = 500_000;
export const MAX_CHAT_MESSAGES = 200;
export const MAX_HISTORY_ENTRIES = 12;
export const MAX_RECENT_SUBS = 5;

export const YT_AD_POLL_MS = 800;

export const SOCKET_PING_INTERVAL = 20_000;
export const SOCKET_PING_TIMEOUT = 30_000;

export const LS_KEYS = {
  userId: "as_userId",
  displayName: "as_displayName",
  screenshot: "as_screenshot",
  hlsQuality: "as_hlsquality",
  scrubPreview: "as_scrubpreview",
  ambilight: "as_ambilight",
  history: "as_history",
  recentSubs: "as_recentSubs",
  speedSync: "as_speedsync",
  urlBarPos: "as_urlbarpos",
  theatreMode: "as_theatremode",
  sidebarOpen: "as_sidebaropen",
  sidebarWidth: "as_sidebarwidth",
  favorites: "as_favorites",
  watched: "as_watched",
  mirrorCamera: "as_mirrorcamera",
  subStyle: "as_subStyle",
  subtitleOffset: "as_subtitleOffset",
  localFileName: "as_localFileName",
};

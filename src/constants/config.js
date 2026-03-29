export const SYNC_CHECK_INTERVAL = 200;
export const SYNC_TOLERANCE_S = 0.5;
export const CLOCK_RECAL_INTERVAL = 30_000;

export const HOST_RECONNECT_GRACE_MS = 6_000;
export const EMPTY_ROOM_CLEANUP_MS = 30_000;
export const SAVE_DEBOUNCE_MS = 2_000;
export const REDIS_TTL_S = 86_400;
export const JWT_EXPIRY_S = 86_400;

export const MAX_CHAT_MESSAGES = 200;
export const MAX_HISTORY_ENTRIES = 12;
export const MAX_RECENT_ROOMS = 3;
export const MAX_RECENT_SUBS = 5;

export const YT_AD_POLL_MS = 800;

export const SOCKET_PING_INTERVAL = 20_000;
export const SOCKET_PING_TIMEOUT = 30_000;

export const LS_KEYS = {
  userId: "wt_userId",
  displayName: "wt_displayName",
  screenshot: "wt_screenshot",
  hlsQuality: "wt_hlsquality",
  scrubPreview: "wt_scrubpreview",
  ambilight: "wt_ambilight",
  history: "wt_history",
  recentSubs: "wt_recentSubs",
  speedSync: "wt_speedsync",
  urlBarPos: "wt_urlbarpos",
  theatreMode: "wt_theatremode",
  sidebarOpen: "wt_sidebaropen",
  sidebarWidth: "wt_sidebarwidth",
};

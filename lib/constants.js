// Single source of truth for every magic number / string key in the codebase.

// Sync loop
export const SYNC_CHECK_INTERVAL = 200; // ms — how often the drift-correction loop runs
export const SYNC_TOLERANCE_S = 0.5; // s  — acceptable drift before rate correction kicks in
export const CLOCK_RECAL_INTERVAL = 30_000; // ms — client/server clock re-calibration period

// Server timings
export const HOST_RECONNECT_GRACE_MS = 6_000; // ms — wait before electing new host after disconnect
export const EMPTY_ROOM_CLEANUP_MS = 30_000; // ms — TTL before removing an empty room from memory
export const SAVE_DEBOUNCE_MS = 2_000; // ms — debounce before writing room state to Redis
export const REDIS_TTL_S = 86_400; // s  — 24h Redis room TTL
export const JWT_EXPIRY_S = 86_400; // s  — 24h host token TTL (matches Redis)

// Chat
export const MAX_CHAT_MESSAGES = 200; // messages kept in memory per room
export const MAX_HISTORY_ENTRIES = 10; // watch history entries in localStorage
export const MAX_RECENT_ROOMS = 3; // recent rooms shown in CreateRoomForm
export const MAX_RECENT_SUBS = 5; // recent subtitle entries

// YouTube
export const YT_AD_POLL_MS = 800; // ms — how often to check for YT ads

// Socket.IO
export const SOCKET_PING_INTERVAL = 20_000; // ms
export const SOCKET_PING_TIMEOUT = 30_000; // ms

// localStorage keys — never rename; existing users would lose their data
export const LS_KEYS = {
  userId: "wt_userId",
  displayName: "wt_displayName",
  screenshot: "wt_screenshot",
  hlsQuality: "wt_hlsquality",
  scrubPreview: "wt_scrubpreview",
  ambilight: "wt_ambilight",
  history: "wt_history",
  recentRooms: "recent_rooms",
  recentSubs: "wt_recentSubs",
  speedSync: "wt_speedsync",
  urlBarPos: "wt_urlbarpos",
  theatreMode: "wt_theatremode",
  sidebarOpen: "wt_sidebaropen",
  sidebarWidth: "wt_sidebarwidth",
};

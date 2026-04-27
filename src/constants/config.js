export const SYNC_CHECK_INTERVAL = 200;
export const SYNC_TOLERANCE_S = 0.5;
export const CLOCK_RECAL_INTERVAL = 30_000;

export const DEBUG = process.env.NODE_ENV !== "production";


export const REDIS_TTL_S = 86_400;
export const JWT_EXPIRY_S = 86_400;

export const MAX_CHAT_MESSAGES = 200;
export const MAX_HISTORY_ENTRIES = 12;
export const MAX_RECENT_SUBS = 5;

export const YT_AD_POLL_MS = 800;
export const YT_POLL_INTERVAL_MS = 250;

export const STREAM_SERVERS = {
  vidlink: "https://vidlink.pro",
  multiembed: "https://multiembed.mov",
  moviesapi: "https://moviesapi.to",
};

export const EXTERNAL_SERVICES = {
  youtubeWatch: "https://www.youtube.com/watch?v=",
  avatarService: "https://api.dicebear.com/9.x/bottts/svg?seed=",
};


export const WS_HTTP_URL = process.env.WS_HTTP_URL || "http://localhost:3001";
export const NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
  theatreMode: "as_theatremode",
  sidebarOpen: "as_sidebaropen",
  sidebarWidth: "as_sidebarwidth",
  favorites: "as_favorites",
  watched: "as_watched",
  mirrorCamera: "as_mirrorcamera",
  subStyle: "as_subStyle",
  subtitleOffset: "as_subtitleOffset",
  localFileName: "as_localFileName",
  syncHub: "as_synchub",
  bingeWatch: "as_bingewatch",
  pwaDismissed: "astra_pwa_dismissed",
  adminSecret: "as_ecret",
};

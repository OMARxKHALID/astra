// Server-side constants (mirrors src/constants/config.js for Next.js side)
// [Note] Keeping duplicates for now - server runs separately and needs these
export const DEBUG = process.env.NODE_ENV !== "production";

export const HOST_RECONNECT_GRACE_MS = 6_000;
export const EMPTY_ROOM_CLEANUP_MS = 30_000;
export const SAVE_DEBOUNCE_MS = 2_000;
export const REDIS_TTL_S = 86_400;
export const SOCKET_PING_INTERVAL = 20_000;
export const SOCKET_PING_TIMEOUT = 30_000;
export const MAX_CHAT_MESSAGES = 200;
export const MAX_DATAURL_BYTES = 500_000;

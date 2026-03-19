/**
 * roomStore — In-memory Map backing the HTTP API layer.
 *
 * Used for:
 *   - Room creation  (POST /api/rooms)
 *   - Initial room existence checks from Next.js
 *
 * The WebSocket server maintains its own state via live connections.
 * The GET /api/rooms/[id] route queries this store first, then falls
 * back to the WS HTTP sidecar (WS_HTTP_URL) so rooms survive HMR restarts.
 *
 * Production: replace Map operations with Redis behind the same interface.
 *
 * @type {Map<string, RoomMeta>}
 *
 * RoomMeta shape:
 * {
 *   roomId:      string,
 *   videoUrl:    string,
 *   hostId:      string,
 *   hostToken:   string,   // secret — never sent to clients
 *   createdAt:   number,   // ms epoch
 * }
 */
export const roomStore = new Map();

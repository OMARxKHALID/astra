// handlers/iframeHandler.js
// Relays host iframe clicks to all guests.
// Follows the same CMD:/REC: pattern as videoHandler.js.
// No room state is mutated — this is a pure relay, so no saveRoom needed.

export default function registerIframeHandlers(
  io,
  socket,
  rooms,
  clientMeta,
  getCtx,
) {
  socket.on("CMD:iframe_click", (_rId, payload) => {
    // getCtx(true) already enforces hostOnlyControls + isHost guard
    const ctx = getCtx(true);
    if (!ctx) return;

    const x = Number(payload?.x);
    const y = Number(payload?.y);

    // Reject garbage values — coordinates must be normalised 0–1
    if (!isFinite(x) || !isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1)
      return;

    // Relay to every client in the room including the host
    // (host replay is a no-op because the overlay already let the click through)
    io.to(ctx.room.roomId).emit("REC:iframe_click", { x, y });
  });
}

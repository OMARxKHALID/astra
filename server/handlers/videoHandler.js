import { saveRoom } from "../models/Room.js";
import { isStrictVideoUrl } from "../utils/auth.js";

export default function registerVideoHandlers(
  io,
  socket,
  rooms,
  clientMeta,
  getCtx,
  tsLastSent,
) {
  socket.on("CMD:ts", (_rId, payload) => {
    const meta = clientMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const now = Date.now();
    if (now - (tsLastSent.get(socket.id) ?? 0) < 500) return;
    tsLastSent.set(socket.id, now);
    const time = typeof payload === "object" ? payload.currentTime : payload;
    room.receiveTimestamp(meta.userId, time);
  });

  socket.on("CMD:play", (_rId, msg) => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.room.paused = false;
    if (msg?.videoTS != null) ctx.room.videoTS = Number(msg.videoTS);
    ctx.room.lastUpdated = Date.now();
    ctx.room.lockTs();
    io.to(ctx.room.roomId).emit("REC:play", { videoTS: ctx.room.videoTS });
    io.to(ctx.room.roomId).emit("REC:host", ctx.room.publicState());
    saveRoom(ctx.room);
  });

  socket.on("CMD:pause", (_rId, msg) => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.room.paused = true;
    if (msg?.videoTS != null) ctx.room.videoTS = Number(msg.videoTS);
    ctx.room.lastUpdated = Date.now();
    ctx.room.lockTs();
    io.to(ctx.room.roomId).emit("REC:pause");
    io.to(ctx.room.roomId).emit("REC:host", ctx.room.publicState());
    saveRoom(ctx.room);
  });

  socket.on("CMD:seek", (_rId, time) => {
    const ctx = getCtx();
    if (!ctx) return;
    const t = parseFloat(time);
    if (!isFinite(t) || t < 0) return;
    ctx.room.videoTS = t;
    ctx.room.lastUpdated = Date.now();
    ctx.room.lockTs();
    io.to(ctx.room.roomId).emit("REC:seek", ctx.room.videoTS);
    io.to(ctx.room.roomId).emit("REC:host", ctx.room.publicState());
    saveRoom(ctx.room);
  });

  socket.on("CMD:playbackRate", (_rId, msg) => {
    const ctx = getCtx();
    if (!ctx) return;
    const rate = Number(msg?.rate);
    ctx.room.playbackRate = isFinite(rate) && rate > 0 ? rate : 1;
    if (msg?.videoTS != null) ctx.room.videoTS = Number(msg.videoTS);
    ctx.room.lastUpdated = Date.now();
    io.to(ctx.room.roomId).emit("REC:host", ctx.room.publicState());
    saveRoom(ctx.room);
  });

  socket.on("CMD:host", (_rId, data) => {
    const meta = clientMeta.get(socket.id);
    if (!meta?.isHost) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    if (
      room.strictVideoUrlMode &&
      data?.video &&
      !isStrictVideoUrl(data.video)
    ) {
      socket.emit("REC:error", {
        message:
          "Unsupported URL: Only direct video file links are allowed in this room.",
        code: "STRICT_VIDEO_MODE",
      });
      return;
    }
    room.changeVideo(
      data?.video || "",
      data?.videoTS || 0,
      data?.paused || false,
      data?.subtitleUrl || "",
    );
    io.to(room.roomId).emit("REC:host", room.publicState());
    saveRoom(room);
  });

  socket.on("CMD:subtitle", (_rId, url) => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.room.subtitleUrl = url || "";
    io.to(ctx.room.roomId).emit("REC:subtitle", ctx.room.subtitleUrl);
    saveRoom(ctx.room);
  });

  socket.on("CMD:tmdbMeta", (_rId, tmdbData) => {
    const ctx = getCtx(false);
    if (!ctx?.meta.isHost) return;
    ctx.room.tmdbMeta = tmdbData || null;
    io.to(ctx.room.roomId).emit("REC:host", ctx.room.publicState());
    saveRoom(ctx.room);
  });
}

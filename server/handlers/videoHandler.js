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
    const clientTs = typeof payload === "object" ? payload.ts : null;
    room.receiveTimestamp(meta.userId, time, meta.isHost, clientTs);
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
    const validRate = isFinite(rate) && rate >= 0.25 && rate <= 4 ? rate : 1;
    ctx.room.playbackRate = validRate;
    if (msg?.videoTS != null) ctx.room.videoTS = Number(msg.videoTS);
    ctx.room.lastUpdated = Date.now();
    ctx.room.lockTs();
    io.to(ctx.room.roomId).emit("REC:host", ctx.room.publicState());
    saveRoom(ctx.room);
  });

  socket.on("CMD:host", (_rId, data) => {
    const meta = clientMeta.get(socket.id);
    if (!meta?.isHost) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;

    const rawUrl = typeof data?.videoUrl === "string" ? data.videoUrl.trim().slice(0, 2048) : "";

    // [Note] blob: URLs are tab-local object URLs — they expire when the originating tab closes.
    // Broadcasting them to other clients or storing in room state causes "Cannot Play Video" on refresh.
    if (rawUrl.startsWith("blob:")) {
      socket.emit("REC:error", {
        message: "Local file URLs cannot be shared with the room. Only this device can play this file.",
        code: "LOCAL_FILE_URL",
      });
      return;
    }

    if (rawUrl) {
      try { new URL(rawUrl); }
      catch {
        socket.emit("REC:error", {
          message: "Invalid video URL",
          code: "INVALID_URL",
        });
        return;
      }
    }

    if (
      room.strictVideoUrlMode &&
      rawUrl &&
      !isStrictVideoUrl(rawUrl)
    ) {
      socket.emit("REC:error", {
        message:
          "Unsupported URL: Only direct video file links are allowed in this room.",
        code: "STRICT_VIDEO_MODE",
      });
      return;
    }

    room.changeVideo(
      rawUrl,
      data?.videoTS || 0,
      data?.paused || false,
      typeof data?.subtitleUrl === "string" ? data.subtitleUrl.trim().slice(0, 2048) : "",
    );
    io.to(room.roomId).emit("REC:host", room.publicState());
    saveRoom(room);
  });

  socket.on("CMD:subtitle", (_rId, url) => {
    const ctx = getCtx();
    if (!ctx) return;
    
    const inputUrl = url == null ? "" : String(url).trim().slice(0, 2048);
    
    let finalUrl = inputUrl;
    if (/^\d+$/.test(inputUrl)) {
      const fileId = inputUrl;
      const serverUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      finalUrl = `${serverUrl}/api/subtitles/download?url=${fileId}`;
    } else if (inputUrl.startsWith("blob:") || inputUrl.startsWith("data:") || inputUrl.startsWith("http")) {
      try { new URL(inputUrl); }
      catch { finalUrl = ""; }
    } else if (inputUrl) {
      finalUrl = "";
    }
    
    ctx.room.subtitleUrl = finalUrl;
    io.to(ctx.room.roomId).emit("REC:subtitle", finalUrl);
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

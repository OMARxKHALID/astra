import { Server } from "socket.io";
import http from "http";
import { Redis } from "@upstash/redis";
import pkg from "@next/env";
import { createHash } from "crypto";

const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd());

// Strict video URL validation — inlined so socket.js is self-contained
const STRICT_VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mkv|mov|avi)$/i;
function isStrictVideoUrl(raw) {
  if (!raw || typeof raw !== "string") return false;
  try {
    const { pathname } = new URL(raw.trim());
    return STRICT_VIDEO_EXTENSIONS.test(pathname.toLowerCase());
  } catch {
    return false;
  }
}

function hashPassword(pw) {
  return createHash("sha256")
    .update(pw + "wt-salt")
    .digest("hex");
}

const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_KV_REST_API_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_KV_REST_API_TOKEN;
const redis =
  redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;
if (!redis)
  console.warn(
    "[socket.io] Redis not configured — room state will not persist.",
  );

const PORT = parseInt(process.env.PORT || process.env.WS_PORT || "3001", 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""));
const HOST_RECONNECT_GRACE_MS = 6000;
const rooms = new Map();

console.log(`[socket.io] Starting server on port ${PORT}...`);
console.log(`[socket.io] Allowed Origins: [${ALLOWED_ORIGINS.join(", ")}]`);

class Room {
  constructor(roomId, video = "", hostId = "", hostToken = "") {
    this.roomId = roomId;
    this.video = video;
    this.subtitleUrl = "";
    this.videoTS = 0;
    this.paused = true;
    this.lastUpdated = Date.now();
    this.hostId = hostId;
    this.hostToken = hostToken;
    this.playbackRate = 1;
    this.hostOnlyControls = false;
    this.strictVideoUrlMode = false;
    this.passwordHash = ""; // "" = no password
    this.clients = new Set();
    this.joinOrder = [];
    this.messages = [];
    this.tsMap = {};
    this.preventTSUpdate = false;
    this.broadcastInterval = null;
  }

  startBroadcast(io) {
    if (this.broadcastInterval) return;
    this.broadcastInterval = setInterval(() => {
      if (this.clients.size === 0) return;
      Object.keys(this.tsMap).forEach((uid) => {
        if (!this.joinOrder.includes(uid)) delete this.tsMap[uid];
      });
      io.to(this.roomId).emit("REC:tsMap", { ...this.tsMap });
      io.to(this.roomId).emit("REC:host", this.publicState());
    }, 1000);
  }

  stopBroadcast() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
  }

  receiveTimestamp(userId, rawTime) {
    if (this.preventTSUpdate) return;
    if (typeof rawTime !== "number" || rawTime < 0) return;
    if (rawTime > this.videoTS) this.videoTS = rawTime;
    this.tsMap[userId] = rawTime;
  }

  changeVideo(newVideo, newVideoTS = 0, newPaused = false, newSubtitle = "") {
    this.video = newVideo;
    this.videoTS = newVideoTS;
    this.paused = newPaused;
    this.subtitleUrl = newSubtitle;
    this.tsMap = {};
    this.preventTSUpdate = true;
    setTimeout(() => {
      this.preventTSUpdate = false;
    }, 1000);
    this.lastUpdated = Date.now();
  }

  publicState() {
    return {
      roomId: this.roomId,
      video: this.video,
      subtitleUrl: this.subtitleUrl || "",
      paused: this.paused,
      videoTS: this.videoTS,
      lastUpdated: this.lastUpdated,
      hostId: this.hostId,
      playbackRate: this.playbackRate,
      hostOnlyControls: this.hostOnlyControls ?? false,
      strictVideoUrlMode: this.strictVideoUrlMode ?? false,
      hasPassword: Boolean(this.passwordHash),
    };
  }

  getParticipants(clientMeta) {
    return this.joinOrder.map((uid) => {
      let username = `Guest-${uid.slice(0, 4)}`;
      for (const meta of clientMeta.values()) {
        if (meta.userId === uid && meta.roomId === this.roomId) {
          username = meta.username;
          break;
        }
      }
      return { userId: uid, username };
    });
  }
}

async function saveRoom(room) {
  if (!redis) return;
  try {
    await redis.set(
      `room:${room.roomId}`,
      {
        roomId: room.roomId,
        video: room.video,
        subtitleUrl: room.subtitleUrl || "",
        paused: room.paused,
        videoTS: room.videoTS,
        lastUpdated: room.lastUpdated,
        hostId: room.hostId,
        hostToken: room.hostToken,
        playbackRate: room.playbackRate,
        hostOnlyControls: room.hostOnlyControls ?? false,
        strictVideoUrlMode: room.strictVideoUrlMode ?? false,
        passwordHash: room.passwordHash || "",
        messages: room.messages || [],
      },
      { ex: 86400 },
    );
  } catch (err) {
    console.error(`[redis] Save failed for ${room.roomId}: ${err.message}`);
  }
}

const httpServer = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200);
    return res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
  }
  const m = req.url?.match(/^\/rooms\/([^/?]+)/);
  if (m) {
    const rId = m[1];
    const room = rooms.get(rId);
    if (!room) {
      res.writeHead(404);
      return res.end("");
    }
    res.writeHead(200);
    return res.end(JSON.stringify(room.publicState()));
  }
  res.writeHead(404);
  res.end("");
});

const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ["GET", "POST"] },
});

const clientMeta = new Map();

io.on("connection", (socket) => {
  socket.on("JOIN_ROOM", async (msg) => {
    const { roomId, token, clientId, videoUrl, username, password } = msg;
    let room = rooms.get(roomId);

    if (!room && redis) {
      try {
        const stored = await redis.get(`room:${roomId}`);
        if (stored) {
          room = new Room(
            roomId,
            stored.video,
            stored.hostId,
            stored.hostToken,
          );
          room.paused = stored.paused ?? true;
          room.videoTS = stored.videoTS ?? 0;
          room.subtitleUrl = stored.subtitleUrl || "";
          room.playbackRate = stored.playbackRate ?? 1;
          room.hostOnlyControls = stored.hostOnlyControls ?? false;
          room.strictVideoUrlMode = stored.strictVideoUrlMode ?? false;
          room.passwordHash = stored.passwordHash || "";
          room.messages = stored.messages || [];
          room.lastUpdated = stored.lastUpdated ?? Date.now();
          rooms.set(roomId, room);
          room.startBroadcast(io);
        }
      } catch (err) {
        console.error(`[socket.io] Redis error: ${err.message}`);
      }
    }

    const isHost = Boolean(token);
    if (!room) {
      room = new Room(roomId, videoUrl || "", clientId, isHost ? token : "");
      rooms.set(roomId, room);
      room.startBroadcast(io);
    } else {
      if (!room.video && videoUrl) room.video = videoUrl;
      if (isHost && !room.hostToken && token) {
        room.hostId = clientId;
        room.hostToken = token;
        if (videoUrl) room.video = videoUrl;
      }
    }

    if (isHost && room.hostToken && token !== room.hostToken) {
      socket.emit("REC:error", { message: "Invalid host token" });
      return;
    }

    // Password check — host is always exempt
    if (room.passwordHash && !isHost) {
      const provided = password ? hashPassword(String(password)) : "";
      if (provided !== room.passwordHash) {
        socket.emit("REC:error", {
          message: "Wrong password",
          code: "WRONG_PASSWORD",
        });
        return;
      }
    }

    if (isHost && token === room.hostToken && room.hostId !== clientId) {
      const prevHostId = room.hostId;
      room.hostId = clientId;
      for (const meta of clientMeta.values()) {
        if (meta.roomId === roomId && meta.userId === prevHostId)
          meta.isHost = false;
      }
      io.to(roomId).emit("host_changed", { newHostId: clientId });
    }

    socket.join(roomId);
    room.clients.add(socket.id);
    const isNewParticipant = !room.joinOrder.includes(clientId);
    if (isNewParticipant) room.joinOrder.push(clientId);

    clientMeta.set(socket.id, {
      userId: clientId,
      roomId,
      isHost: isHost && token === room.hostToken,
      username,
    });

    socket.emit("REC:host", room.publicState());
    socket.emit("REC:tsMap", room.tsMap);
    if (room.messages.length > 0)
      socket.emit("chat_history", {
        type: "chat_history",
        messages: room.messages,
      });

    io.to(roomId).emit("REC:roster", room.getParticipants(clientMeta));
    if (isNewParticipant)
      socket.to(roomId).emit("user_joined", { userId: clientId, username });

    if (!room.hostId) electNewHost(room);
  });

  const handleCmd = (socket) => {
    const meta = clientMeta.get(socket.id);
    if (!meta) return null;
    const room = rooms.get(meta.roomId);
    if (!room) return null;
    if (room.hostOnlyControls && !meta.isHost) return null;
    return { room, meta };
  };

  socket.on("CMD:ts", (rId, payload) => {
    const meta = clientMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const time = typeof payload === "object" ? payload.currentTime : payload;
    room.receiveTimestamp(meta.userId, time);
  });

  socket.on("CMD:play", (msg) => {
    const ctx = handleCmd(socket);
    if (ctx) {
      ctx.room.paused = false;
      if (msg && typeof msg.videoTS === "number")
        ctx.room.videoTS = msg.videoTS;
      ctx.room.lastUpdated = Date.now();
      ctx.room.tsMap = {};
      ctx.room.preventTSUpdate = true;
      setTimeout(() => {
        ctx.room.preventTSUpdate = false;
      }, 1000);
      io.to(ctx.room.roomId).emit("REC:play", { videoTS: ctx.room.videoTS });
      io.to(ctx.room.roomId).emit("REC:host", ctx.room.publicState());
      saveRoom(ctx.room);
    }
  });

  socket.on("CMD:pause", (msg) => {
    const ctx = handleCmd(socket);
    if (ctx) {
      ctx.room.paused = true;
      ctx.room.lastUpdated = Date.now();
      if (msg && typeof msg.videoTS === "number")
        ctx.room.videoTS = msg.videoTS;
      ctx.room.tsMap = {};
      ctx.room.preventTSUpdate = true;
      setTimeout(() => {
        ctx.room.preventTSUpdate = false;
      }, 1000);
      io.to(ctx.room.roomId).emit("REC:pause");
      io.to(ctx.room.roomId).emit("REC:host", ctx.room.publicState());
      saveRoom(ctx.room);
    }
  });

  socket.on("CMD:seek", (time) => {
    const ctx = handleCmd(socket);
    if (ctx) {
      ctx.room.videoTS = time;
      ctx.room.tsMap = {};
      ctx.room.lastUpdated = Date.now();
      ctx.room.preventTSUpdate = true;
      setTimeout(() => {
        ctx.room.preventTSUpdate = false;
      }, 1000);
      io.to(ctx.room.roomId).emit("REC:seek", time);
      io.to(ctx.room.roomId).emit("REC:host", ctx.room.publicState());
      saveRoom(ctx.room);
    }
  });

  socket.on("CMD:playbackRate", (msg) => {
    const ctx = handleCmd(socket);
    if (ctx) {
      ctx.room.playbackRate = Number(msg.rate) || 1;
      if (msg.videoTS !== undefined) ctx.room.videoTS = Number(msg.videoTS);
      ctx.room.lastUpdated = Date.now();
      io.to(ctx.room.roomId).emit("REC:host", ctx.room.publicState());
      saveRoom(ctx.room);
    }
  });

  socket.on("CMD:host", (data) => {
    const meta = clientMeta.get(socket.id);
    if (meta?.isHost) {
      const room = rooms.get(meta.roomId);
      if (room) {
        if (room.strictVideoUrlMode && data.video) {
          if (!isStrictVideoUrl(data.video)) {
            socket.emit("REC:error", {
              message:
                "Unsupported URL: Only direct video file links are allowed in this room.",
              code: "STRICT_VIDEO_MODE",
            });
            return;
          }
        }
        room.changeVideo(
          data.video,
          data.videoTS || 0,
          data.paused || false,
          data.subtitleUrl || "",
        );
        io.to(room.roomId).emit("REC:host", room.publicState());
        saveRoom(room);
      }
    }
  });

  socket.on("CMD:subtitle", (url) => {
    const ctx = handleCmd(socket);
    if (ctx) {
      ctx.room.subtitleUrl = url;
      io.to(ctx.room.roomId).emit("REC:subtitle", ctx.room.subtitleUrl);
      saveRoom(ctx.room);
    }
  });

  socket.on("CMD:lock", () => {
    const meta = clientMeta.get(socket.id);
    if (!meta?.isHost) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    room.hostOnlyControls = !room.hostOnlyControls;
    io.to(room.roomId).emit("REC:host", room.publicState());
    saveRoom(room);
  });

  socket.on("CMD:strictVideoUrlMode", () => {
    const meta = clientMeta.get(socket.id);
    if (!meta?.isHost) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    room.strictVideoUrlMode = !room.strictVideoUrlMode;
    io.to(room.roomId).emit("REC:host", room.publicState());
    saveRoom(room);
  });

  // Set/remove room password — host only
  socket.on("CMD:setPassword", (msg) => {
    const meta = clientMeta.get(socket.id);
    if (!meta?.isHost) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const pw = msg?.password ? String(msg.password).trim().slice(0, 64) : "";
    room.passwordHash = pw ? hashPassword(pw) : "";
    io.to(room.roomId).emit("REC:host", room.publicState());
    saveRoom(room);
  });

  socket.on("CMD:kick", (msg) => {
    const meta = clientMeta.get(socket.id);
    if (!meta?.isHost) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const { targetUserId } = msg || {};
    if (!targetUserId || targetUserId === meta.userId) return;
    for (const [sid, m] of clientMeta.entries()) {
      if (m.roomId === meta.roomId && m.userId === targetUserId) {
        io.to(sid).emit("REC:error", {
          message: "You have been removed from the room.",
        });
        io.sockets.sockets.get(sid)?.disconnect(true);
        break;
      }
    }
  });

  socket.on("CMD:setName", (msg) => {
    const meta = clientMeta.get(socket.id);
    if (!meta) return;
    meta.username = String(msg.username || "")
      .slice(0, 24)
      .trim();
    io.to(meta.roomId).emit("name_changed", {
      userId: meta.userId,
      username: meta.username,
    });
  });

  // Typing indicators — broadcast to others in room only
  socket.on("CMD:typing", () => {
    const meta = clientMeta.get(socket.id);
    if (!meta) return;
    socket.to(meta.roomId).emit("user_typing", {
      userId: meta.userId,
      username: meta.username,
    });
  });

  socket.on("chat", (msg) => {
    const meta = clientMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const chatMsg = {
      type: "chat",
      senderId: meta.userId,
      senderName: meta.username,
      text: String(msg.text || "")
        .slice(0, 500)
        .trim(),
      ts: Date.now(),
      // Screenshot messages carry a dataUrl field
      dataUrl: msg.dataUrl ? String(msg.dataUrl).slice(0, 300000) : undefined,
    };
    if (chatMsg.text || chatMsg.dataUrl) {
      room.messages.push(chatMsg);
      if (room.messages.length > 200) room.messages = room.messages.slice(-200);
      io.to(meta.roomId).emit("chat", chatMsg);
      saveRoom(room);
    }
  });

  socket.on("disconnect", () => {
    const meta = clientMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (room) {
      room.clients.delete(socket.id);
      room.joinOrder = room.joinOrder.filter((id) => id !== meta.userId);
      delete room.tsMap[meta.userId];
      if (room.clients.size === 0) {
        saveRoom(room);
        setTimeout(() => {
          if (room.clients.size === 0) {
            room.stopBroadcast();
            rooms.delete(room.roomId);
          }
        }, 30000);
      } else {
        io.to(room.roomId).emit("user_left", {
          userId: meta.userId,
          username: meta.username,
          count: room.clients.size,
        });
        io.to(room.roomId).emit("REC:roster", room.getParticipants(clientMeta));
        if (meta.isHost) {
          setTimeout(() => {
            const r = rooms.get(meta.roomId);
            if (
              r &&
              r.hostId === meta.userId &&
              !r.joinOrder.includes(meta.userId)
            )
              electNewHost(r);
          }, HOST_RECONNECT_GRACE_MS);
        }
      }
    }
    clientMeta.delete(socket.id);
  });
});

function electNewHost(room) {
  for (const userId of room.joinOrder) {
    for (const [sid, meta] of clientMeta.entries()) {
      if (meta.roomId === room.roomId && meta.userId === userId) {
        room.hostId = userId;
        meta.isHost = true;
        io.to(room.roomId).emit("host_changed", { newHostId: userId });
        saveRoom(room);
        return;
      }
    }
  }
}

httpServer.listen(PORT, "0.0.0.0", () =>
  console.log(`\n🚀 [socket.io] SERVER ONLINE: 0.0.0.0:${PORT}\n`),
);

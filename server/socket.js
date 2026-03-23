import { Server } from "socket.io";
import http from "http";
import { Redis } from "@upstash/redis";
import pkg from "@next/env";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import {
  HOST_RECONNECT_GRACE_MS,
  EMPTY_ROOM_CLEANUP_MS,
  SAVE_DEBOUNCE_MS,
  REDIS_TTL_S,
  SOCKET_PING_INTERVAL,
  SOCKET_PING_TIMEOUT,
  MAX_CHAT_MESSAGES,
  MAX_DATAURL_BYTES,
} from "./constants.js";

const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd());

// ─── JWT (HS256, zero external dep) ──────────────────────────────────────────
function jwtSecret() {
  return process.env.JWT_SECRET || "dev-fallback-not-secure";
}

function verifyHostToken(token, expectedRoomId) {
  // Support legacy UUID tokens during migration
  if (!token) return false;

  // Try JWT first
  if (token.includes(".")) {
    try {
      const [header, claims, sig] = token.split(".");
      if (!header || !claims || !sig) return false;
      const expected = createHmac("sha256", jwtSecret())
        .update(`${header}.${claims}`)
        .digest("base64url");
      const a = Buffer.from(sig, "base64url");
      const b = Buffer.from(expected, "base64url");
      if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
      const payload = JSON.parse(Buffer.from(claims, "base64url").toString());
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000))
        return false;
      if (payload.role !== "host") return false;
      if (expectedRoomId && payload.roomId !== expectedRoomId) return false;
      return { hostId: payload.sub, ...payload };
    } catch {
      return false;
    }
  }

  // Legacy UUID token — accept as-is (backwards compatibility)
  return { legacy: true };
}

function extractHostId(token) {
  if (!token?.includes(".")) return null;
  try {
    const claims = token.split(".")[1];
    const payload = JSON.parse(Buffer.from(claims, "base64url").toString());
    return payload.sub || null;
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STRICT_EXTS = /\.(mp4|webm|ogg|mkv|mov|avi)$/i;
function isStrictVideoUrl(raw) {
  if (!raw || typeof raw !== "string") return false;
  try {
    return STRICT_EXTS.test(new URL(raw.trim()).pathname.toLowerCase());
  } catch {
    return false;
  }
}

function hashPassword(pw) {
  return createHash("sha256")
    .update(pw + "wt-salt")
    .digest("hex");
}

// Debounce a function — returns a wrapper that delays invocation until
// `wait` ms of inactivity.
function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// ─── Config ───────────────────────────────────────────────────────────────────
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
const rooms = new Map(); // roomId → Room
const clientMeta = new Map(); // socketId → { userId, roomId, isHost, username }
const tsLastSent = new Map(); // socketId → last CMD:ts epoch ms (rate limiting)

console.log(
  `[socket.io] Starting on port ${PORT} | Origins: [${ALLOWED_ORIGINS.join(", ")}]`,
);

// ─── Room class ───────────────────────────────────────────────────────────────
class Room {
  constructor(roomId, video = "", hostId = "", hostToken = "") {
    this.roomId = roomId;
    this.video = video;
    this.subtitleUrl = "";
    this.videoTS = 0;
    this.paused = true;
    this.tmdbMeta = null; // Synced movie/show info
    this.lastUpdated = Date.now();
    this.createdAt = Date.now();
    this.hostId = hostId;
    this.hostToken = hostToken;
    this.playbackRate = 1;
    this.hostOnlyControls = false;
    this.strictVideoUrlMode = false;
    this.passwordHash = "";

    // Participant tracking
    this.joinOrder = []; // ordered userId list
    this.usernames = new Map(); // userId → username (O(1) lookup)
    this.connCounts = new Map(); // userId → # of active sockets
    this.socketIds = new Set(); // active socket IDs in this room

    // Sync state
    this.tsMap = {}; // userId → currentTime
    this.tsLockUntil = 0; // epoch ms — ignore CMD:ts before this
    this.lastBroadcastTime = Date.now(); // epoch ms — used for timestamp normalization

    // Chat — dataUrls are NEVER stored (memory/bandwidth)
    this.messages = []; // max 200 text-only messages
    this.broadcastTimer = null;
    this.lastBcastState = null; // fingerprint to skip no-op broadcasts
  }

  // ── Participant helpers ────────────────────────────────────────────────────
  addUser(socketId, userId, username) {
    this.socketIds.add(socketId);
    this.usernames.set(userId, username);
    const prev = this.connCounts.get(userId) || 0;
    this.connCounts.set(userId, prev + 1);
    if (!this.joinOrder.includes(userId)) this.joinOrder.push(userId);
  }

  removeSocket(socketId, userId) {
    this.socketIds.delete(socketId);
    const count = (this.connCounts.get(userId) || 1) - 1;
    if (count <= 0) {
      this.connCounts.delete(userId);
      this.usernames.delete(userId);
      this.joinOrder = this.joinOrder.filter((id) => id !== userId);
      delete this.tsMap[userId];
      return true; // user fully left
    }
    this.connCounts.set(userId, count);
    return false; // user still has another tab open
  }

  // O(n) — only called on join/leave events, not on every tick
  getParticipants() {
    return this.joinOrder.map((uid) => ({
      userId: uid,
      username: this.usernames.get(uid) || `Guest-${uid.slice(0, 4)}`,
    }));
  }

  // ── Sync helpers ───────────────────────────────────────────────────────────
  lockTs(ms = 1500) {
    this.tsLockUntil = Date.now() + ms;
  }

  receiveTimestamp(userId, time) {
    if (Date.now() < this.tsLockUntil) return;
    if (typeof time !== "number" || time < 0) return;
    // Normalize: subtract elapsed time since last broadcast so a late-arriving
    // report doesn't push the room clock forward artificially.
    // +1 projects to the next broadcast window (~1s away) — mirrors watchparty's formula.
    const staleness = (Date.now() - this.lastBroadcastTime) / 1000;
    const normalized = Math.max(0, time - staleness + 1);
    if (normalized > this.videoTS) this.videoTS = normalized;
    this.tsMap[userId] = normalized;
  }

  changeVideo(video, videoTS = 0, paused = false, subtitleUrl = "") {
    this.video = video;
    this.videoTS = videoTS;
    this.paused = paused;
    this.subtitleUrl = subtitleUrl;
    this.tmdbMeta = null; // Clear metadata on video change
    this.tsMap = {};
    this.lockTs(1500);
    this.lastUpdated = Date.now();
  }

  // ── State ──────────────────────────────────────────────────────────────────
  publicState() {
    return {
      roomId: this.roomId,
      video: this.video,
      subtitleUrl: this.subtitleUrl || "",
      paused: this.paused,
      videoTS: this.videoTS,
      lastUpdated: this.lastUpdated,
      createdAt: this.createdAt,
      hostId: this.hostId,
      playbackRate: this.playbackRate,
      hostOnlyControls: this.hostOnlyControls,
      strictVideoUrlMode: this.strictVideoUrlMode,
      hasPassword: Boolean(this.passwordHash),
      tmdbMeta: this.tmdbMeta,
    };
  }

  // Lightweight fingerprint — only broadcast REC:host when something changed
  _stateFingerprint() {
    return `${this.video}|${this.videoTS.toFixed(1)}|${this.paused}|${this.playbackRate}|${this.hostId}|${this.hostOnlyControls}|${this.strictVideoUrlMode}|${Boolean(this.passwordHash)}|${this.tmdbMeta?.id || ""}`;
  }

  // ── Broadcast interval ─────────────────────────────────────────────────────
  startBroadcast(io) {
    if (this.broadcastTimer) return;
    this.broadcastTimer = setInterval(() => {
      if (this.socketIds.size === 0) return;

      // tsMap: prune entries for users no longer in room
      const validUsers = new Set(this.joinOrder);
      for (const uid of Object.keys(this.tsMap)) {
        if (!validUsers.has(uid)) delete this.tsMap[uid];
      }

      const times = Object.values(this.tsMap)
        .filter((t) => typeof t === "number")
        .sort((a, b) => a - b);
      const leaderTime = times.length ? times[Math.floor(times.length / 2)] : this.videoTS;

      io.to(this.roomId).emit("REC:tsMap", { ...this.tsMap, _leaderTime_: leaderTime });
      this.lastBroadcastTime = Date.now();

      // REC:host: only emit when state changed
      const fp = this._stateFingerprint();
      if (fp !== this.lastBcastState) {
        io.to(this.roomId).emit("REC:host", this.publicState());
        this.lastBcastState = fp;
      }
    }, 1000);
  }

  stopBroadcast() {
    clearInterval(this.broadcastTimer);
    this.broadcastTimer = null;
  }
}

// ─── Redis persistence ────────────────────────────────────────────────────────
// Debounced per-room save — collapses rapid sequential writes into one
const debouncedSave = new Map(); // roomId → debounced fn

function saveRoom(room) {
  if (!redis) return;
  if (!debouncedSave.has(room.roomId)) {
    debouncedSave.set(
      room.roomId,
      debounce(async (r) => {
        try {
          await redis.set(
            `room:${r.roomId}`,
            {
              roomId: r.roomId,
              video: r.video,
              subtitleUrl: r.subtitleUrl || "",
              paused: r.paused,
              videoTS: r.videoTS,
              lastUpdated: r.lastUpdated,
              hostId: r.hostId,
              hostToken: r.hostToken,
              playbackRate: r.playbackRate,
              hostOnlyControls: r.hostOnlyControls,
              strictVideoUrlMode: r.strictVideoUrlMode,
              passwordHash: r.passwordHash || "",
              tmdbMeta: r.tmdbMeta || null,
              // Only store text messages — no dataUrls
              messages: (r.messages || []).map((m) => ({
                ...m,
                dataUrl: undefined,
              })),
            },
            { ex: REDIS_TTL_S },
          );
        } catch (err) {
          console.error(`[redis] save failed ${r.roomId}: ${err.message}`);
        }
      }, SAVE_DEBOUNCE_MS),
    ); // collapse writes within 2s window
  }
  debouncedSave.get(room.roomId)(room);
}

function cleanupRoom(roomId) {
  debouncedSave.delete(roomId);
}

// ─── HTTP sidecar ─────────────────────────────────────────────────────────────
const httpServer = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200);
    return res.end(
      JSON.stringify({ ok: true, rooms: rooms.size, clients: clientMeta.size }),
    );
  }

  const m = req.url?.match(/^\/rooms\/([^/?]+)/);
  if (m) {
    const room = rooms.get(m[1]);
    if (!room) {
      res.writeHead(404);
      return res.end("{}");
    }
    res.writeHead(200);
    return res.end(JSON.stringify(room.publicState()));
  }

  res.writeHead(404);
  res.end("{}");
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ["GET", "POST"] },
  // Increase ping timeout for slow connections; reduce ping interval
  // to detect dead clients faster without flooding
  pingInterval: SOCKET_PING_INTERVAL,
  pingTimeout: SOCKET_PING_TIMEOUT,
  // Limit how much unacknowledged data can queue up per socket
  maxHttpBufferSize: 1e6, // 1 MB — screenshots are ≤300KB, safe
});

io.on("connection", (socket) => {
  // ── Clock calibration ──────────────────────────────────────────────────────
  // Client sends its local Date.now() t0; we reply with our server Date.now().
  // Client computes: rtt = Date.now() - t0; serverNow ≈ serverTime + rtt/2;
  // clockOffset = serverNow - Date.now().  Used in expectedTime() to compensate
  // for client-server clock skew (can be ±200ms on unsynced machines).
  socket.on("PING_CLOCK", (t0, ack) => {
    if (typeof ack === "function") ack(Date.now());
  });
  socket.on("JOIN_ROOM", async (msg) => {
    const { roomId, token, clientId, videoUrl, username, password } = msg || {};
    if (!roomId || !clientId) return;

    let room = rooms.get(roomId);

    // Try to restore from Redis if not in memory
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
          room.tmdbMeta = stored.tmdbMeta || null;
          room.messages = (stored.messages || []).filter((m) => m.text); // text only
          room.lastUpdated = stored.lastUpdated ?? Date.now();
          rooms.set(roomId, room);
          room.startBroadcast(io);
        }
      } catch (err) {
        console.error(`[redis] read error: ${err.message}`);
      }
    }

    const isHost = Boolean(token);
    const jwtPayload = isHost ? verifyHostToken(token, roomId) : false;

    // Create room if first visitor
    if (!room) {
      const hostIdFromToken = jwtPayload ? jwtPayload.hostId || clientId : "";
      room = new Room(
        roomId,
        videoUrl || "",
        hostIdFromToken,
        isHost ? token : "",
      );
      rooms.set(roomId, room);
      room.startBroadcast(io);
    } else {
      if (!room.video && videoUrl) room.video = videoUrl;
      if (isHost && !room.hostToken && token && jwtPayload) {
        room.hostId = jwtPayload.hostId || clientId;
        room.hostToken = token;
        if (videoUrl) room.video = videoUrl;
      }
    }

    // Auth checks
    if (isHost && !jwtPayload) {
      socket.emit("REC:error", { message: "Invalid host token" });
      return;
    }
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

    // Host identity transfer — use hostId from JWT payload, not clientId
    const effectiveHostId = jwtPayload?.hostId || clientId;
    if (isHost && jwtPayload && room.hostId !== effectiveHostId) {
      const prev = room.hostId;
      room.hostId = effectiveHostId;
      for (const meta of clientMeta.values()) {
        if (meta.roomId === roomId && meta.userId === prev) meta.isHost = false;
      }
      io.to(roomId).emit("host_changed", { newHostId: effectiveHostId });
    }

    socket.join(roomId);
    const displayName = (username || `Guest-${clientId.slice(0, 4)}`).slice(
      0,
      24,
    );
    const wasNew = !room.joinOrder.includes(clientId);
    room.addUser(socket.id, clientId, displayName);

    clientMeta.set(socket.id, {
      userId: clientId,
      roomId,
      isHost: Boolean(isHost && jwtPayload),
      username: displayName,
    });

    // Send state to the new joiner
    // reconnected=true when the same userId rejoins (not a brand new user)
    socket.emit("REC:host", { ...room.publicState(), reconnected: !wasNew });
    socket.emit("REC:tsMap", { ...room.tsMap });

    // Chat history: text-only, no dataUrls
    if (room.messages.length > 0) {
      socket.emit("chat_history", {
        type: "chat_history",
        messages: room.messages.map((m) => ({ ...m, dataUrl: undefined })),
      });
    }

    // Notify everyone
    io.to(roomId).emit("REC:roster", room.getParticipants());
    if (wasNew)
      socket
        .to(roomId)
        .emit("user_joined", { userId: clientId, username: displayName });

    if (!room.hostId) electNewHost(room);
  });

  // ── Command gating ─────────────────────────────────────────────────────────
  function getCtx(requireControl = true) {
    const meta = clientMeta.get(socket.id);
    if (!meta) return null;
    const room = rooms.get(meta.roomId);
    if (!room) return null;
    if (requireControl && room.hostOnlyControls && !meta.isHost) return null;
    return { room, meta };
  }

  // ── Timestamp ──────────────────────────────────────────────────────────────
  socket.on("CMD:ts", (_rId, payload) => {
    const meta = clientMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    // Rate-limit: accept at most one CMD:ts per 500ms per socket.
    // Prevents a misbehaving or spamming client from flooding receiveTimestamp().
    const now = Date.now();
    if (now - (tsLastSent.get(socket.id) ?? 0) < 500) return;
    tsLastSent.set(socket.id, now);
    const time = typeof payload === "object" ? payload.currentTime : payload;
    room.receiveTimestamp(meta.userId, time);
  });

  // ── Play ───────────────────────────────────────────────────────────────────
  socket.on("CMD:play", (msg) => {
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

  // ── Pause ──────────────────────────────────────────────────────────────────
  socket.on("CMD:pause", (msg) => {
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

  // ── Seek ───────────────────────────────────────────────────────────────────
  socket.on("CMD:seek", (time) => {
    const ctx = getCtx();
    if (!ctx) return;
    const t = parseFloat(time);
    if (!isFinite(t) || t < 0) return; // reject garbage
    ctx.room.videoTS = t;
    ctx.room.lastUpdated = Date.now();
    ctx.room.lockTs();
    io.to(ctx.room.roomId).emit("REC:seek", ctx.room.videoTS);
    io.to(ctx.room.roomId).emit("REC:host", ctx.room.publicState());
    saveRoom(ctx.room);
  });

  // ── Playback rate ──────────────────────────────────────────────────────────
  socket.on("CMD:playbackRate", (msg) => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.room.playbackRate = Number(msg?.rate) || 1;
    if (msg?.videoTS != null) ctx.room.videoTS = Number(msg.videoTS);
    ctx.room.lastUpdated = Date.now();
    io.to(ctx.room.roomId).emit("REC:host", ctx.room.publicState());
    saveRoom(ctx.room);
  });

  // ── Change video ───────────────────────────────────────────────────────────
  socket.on("CMD:host", (data) => {
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

  // ── Subtitle ───────────────────────────────────────────────────────────────
  socket.on("CMD:subtitle", (url) => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.room.subtitleUrl = url || "";
    io.to(ctx.room.roomId).emit("REC:subtitle", ctx.room.subtitleUrl);
    saveRoom(ctx.room);
  });

  // ── Host-only lock ─────────────────────────────────────────────────────────
  socket.on("CMD:lock", () => {
    const ctx = getCtx(false);
    if (!ctx?.meta.isHost) return;
    ctx.room.hostOnlyControls = !ctx.room.hostOnlyControls;
    io.to(ctx.room.roomId).emit("REC:host", ctx.room.publicState());
    saveRoom(ctx.room);
  });

  // ── Strict URL mode ────────────────────────────────────────────────────────
  socket.on("CMD:strictVideoUrlMode", () => {
    const ctx = getCtx(false);
    if (!ctx?.meta.isHost) return;
    ctx.room.strictVideoUrlMode = !ctx.room.strictVideoUrlMode;
    io.to(ctx.room.roomId).emit("REC:host", ctx.room.publicState());
    saveRoom(ctx.room);
  });

  // ── TMDB Meta override ───────────────────────────────────────────────────
  socket.on("CMD:tmdbMeta", (meta) => {
    const meta_ctx = getCtx(false); // Anyone can help fix metadata? Let's allow everyone or just host.
    // Given the user's request "i can cancel", I'll allow host/authorized members.
    // To keep it simple and useful, let's allow the current host only for now.
    if (!meta_ctx?.meta.isHost) return;
    meta_ctx.room.tmdbMeta = meta || null;
    io.to(meta_ctx.room.roomId).emit("REC:host", meta_ctx.room.publicState());
    saveRoom(meta_ctx.room);
  });
  socket.on("CMD:setPassword", (msg) => {
    const ctx = getCtx(false);
    if (!ctx?.meta.isHost) return;
    const pw = msg?.password ? String(msg.password).trim().slice(0, 64) : "";
    ctx.room.passwordHash = pw ? hashPassword(pw) : "";
    io.to(ctx.room.roomId).emit("REC:host", ctx.room.publicState());
    saveRoom(ctx.room);
  });

  // ── Kick ───────────────────────────────────────────────────────────────────
  socket.on("CMD:kick", (msg) => {
    const meta = clientMeta.get(socket.id);
    if (!meta?.isHost) return;
    const { targetUserId } = msg || {};
    if (!targetUserId || targetUserId === meta.userId) return;
    for (const [sid, m] of clientMeta.entries()) {
      if (m.roomId === meta.roomId && m.userId === targetUserId) {
        io.to(sid).emit("REC:error", {
          message: "You have been removed from the room.",
        });
        io.sockets.sockets.get(sid)?.disconnect(true);
        // Don't break — kick all tabs of that user
      }
    }
  });

  // ── Transfer host ─────────────────────────────────────────────────────────
  // Current host can voluntarily hand ownership to any active viewer.
  // The new host gets a fresh JWT-style session — they will appear as host
  // in the UI immediately via the host_changed broadcast.
  socket.on("CMD:transferHost", (msg) => {
    const meta = clientMeta.get(socket.id);
    if (!meta?.isHost) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const { targetUserId } = msg || {};
    if (!targetUserId || targetUserId === meta.userId) return;
    // Verify target is actually in the room
    let found = false;
    for (const m of clientMeta.values()) {
      if (m.roomId === meta.roomId && m.userId === targetUserId) {
        found = true;
        break;
      }
    }
    if (!found) return;
    // Demote current host
    meta.isHost = false;
    // Promote new host — all their sockets
    for (const m of clientMeta.values()) {
      if (m.roomId === meta.roomId && m.userId === targetUserId)
        m.isHost = true;
    }
    room.hostId = targetUserId;
    io.to(room.roomId).emit("host_changed", {
      newHostId: targetUserId,
      transferredFrom: meta.userId,
    });
    saveRoom(room);
  });

  // ── Name change ────────────────────────────────────────────────────────────
  socket.on("CMD:setName", (msg) => {
    const meta = clientMeta.get(socket.id);
    if (!meta) return;
    const name = String(msg?.username || "")
      .slice(0, 24)
      .trim();
    if (!name) return;
    meta.username = name;
    const room = rooms.get(meta.roomId);
    if (room) room.usernames.set(meta.userId, name);
    io.to(meta.roomId).emit("name_changed", {
      userId: meta.userId,
      username: name,
    });
  });

  // ── Typing indicator ───────────────────────────────────────────────────────
  socket.on("CMD:typing", () => {
    const meta = clientMeta.get(socket.id);
    if (!meta) return;
    socket.to(meta.roomId).emit("user_typing", {
      userId: meta.userId,
      username: meta.username,
    });
  });

  // ── Chat ───────────────────────────────────────────────────────────────────
  socket.on("chat", (msg) => {
    const meta = clientMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;

    const text = String(msg?.text || "")
      .slice(0, 500)
      .trim();
    const dataUrl = msg?.dataUrl
      ? String(msg.dataUrl).slice(0, MAX_DATAURL_BYTES)
      : undefined;
    if (!text && !dataUrl) return;

    const chatMsg = {
      type: "chat",
      senderId: meta.userId,
      senderName: meta.username,
      text,
      ts: Date.now(),
      ...(dataUrl ? { dataUrl } : {}),
    };

    // Broadcast immediately (including dataUrl for live recipients)
    io.to(meta.roomId).emit("chat", chatMsg);

    // Store for history — text only, screenshots are ephemeral
    if (text) {
      room.messages.push({ ...chatMsg, dataUrl: undefined });
      if (room.messages.length > 200) room.messages = room.messages.slice(-200);
      saveRoom(room); // debounced — rapid chat = single write
    }
    // Screenshot: do NOT save to Redis — only delivered live
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    const meta = clientMeta.get(socket.id);
    if (!meta) return;
    clientMeta.delete(socket.id);
    tsLastSent.delete(socket.id);

    const room = rooms.get(meta.roomId);
    if (!room) return;

    const fullyLeft = room.removeSocket(socket.id, meta.userId);

    if (room.socketIds.size === 0) {
      // Room empty — persist and schedule cleanup
      saveRoom(room);
      setTimeout(() => {
        if (room.socketIds.size === 0) {
          room.stopBroadcast();
          rooms.delete(room.roomId);
          cleanupRoom(room.roomId);
        }
      }, EMPTY_ROOM_CLEANUP_MS);
      return;
    }

    if (fullyLeft) {
      io.to(room.roomId).emit("user_left", {
        userId: meta.userId,
        username: meta.username,
      });
      io.to(room.roomId).emit("REC:roster", room.getParticipants());

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
  });
});

// ─── Host election ────────────────────────────────────────────────────────────
function electNewHost(room) {
  // Pick the first user in join order who still has an active socket
  const activeUsers = new Set(
    [...clientMeta.values()]
      .filter((m) => m.roomId === room.roomId)
      .map((m) => m.userId),
  );
  for (const userId of room.joinOrder) {
    if (activeUsers.has(userId)) {
      room.hostId = userId;
      // Mark all sockets of this user as host
      for (const [, meta] of clientMeta.entries()) {
        if (meta.roomId === room.roomId && meta.userId === userId)
          meta.isHost = true;
      }
      io.to(room.roomId).emit("host_changed", { newHostId: userId });
      saveRoom(room);
      return;
    }
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, "0.0.0.0", () =>
  console.log(`\n🚀 [socket.io] ONLINE: 0.0.0.0:${PORT}\n`),
);

import { WebSocketServer, WebSocket } from "ws";
import http from "http";

const PORT = parseInt(process.env.PORT || process.env.WS_PORT || "3001", 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

const HOST_RECONNECT_GRACE_MS = 6000;
const rooms = new Map();
const clientMeta = new Map();

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

function broadcast(roomId, payload, excludeWs = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  const msg = JSON.stringify(payload);
  for (const client of room.clients) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN)
      client.send(msg);
  }
}

function broadcastAll(roomId, payload) {
  broadcast(roomId, payload, null);
}

function publicState(room) {
  return {
    roomId: room.roomId,
    videoUrl: room.videoUrl,
    isPlaying: room.isPlaying,
    currentTime: room.currentTime,
    lastUpdated: room.lastUpdated,
    hostId: room.hostId,
    playbackRate: room.playbackRate,
  };
}

function getOrCreateRoom(roomId, videoUrl, hostId, hostToken) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      roomId,
      videoUrl: videoUrl || "",
      isPlaying: false,
      currentTime: 0,
      lastUpdated: Date.now(),
      hostId,
      hostToken,
      playbackRate: 1,
      clients: new Set(),
      joinOrder: [],
    });
  }
  return rooms.get(roomId);
}

function getUsernameForId(roomId, userId) {
  for (const [, meta] of clientMeta) {
    if (meta.roomId === roomId && meta.userId === userId) return meta.username;
  }
  return `Guest-${userId.slice(0, 4)}`;
}

function getRoomParticipants(room) {
  return room.joinOrder.map((uid) => ({
    userId: uid,
    username: getUsernameForId(room.roomId, uid),
  }));
}

function electNewHost(room) {
  for (const userId of room.joinOrder) {
    if (userId === room.hostId) continue;
    for (const [ws, meta] of clientMeta) {
      if (meta.roomId === room.roomId && meta.userId === userId) {
        room.hostId = userId;
        meta.isHost = true;
        broadcastAll(room.roomId, { type: "host_changed", newHostId: userId });
        broadcastAll(room.roomId, {
          type: "chat",
          senderId: "system",
          senderName: "System",
          text: `👑 ${meta.username} is now the host.`,
          ts: Date.now(),
        });
        return;
      }
    }
  }
}

function makeRateLimiter(max = 5) {
  let n = 0;
  const iv = setInterval(() => {
    n = 0;
  }, 1000);
  return { allow: () => ++n <= max, destroy: () => clearInterval(iv) };
}

// ── HTTP server ─────────────────────────────────────────────────────────────
const httpServer = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  // Health check for Render/Vercel/Fly
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200);
    return res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
  }

  // Room metadata query
  const m = req.url?.match(/^\/rooms\/([^/?]+)/);
  if (m) {
    const room = rooms.get(m[1]);
    if (!room) {
      res.writeHead(404);
      return res.end("{}");
    }
    res.writeHead(200);
    return res.end(JSON.stringify(publicState(room)));
  }

  res.writeHead(404);
  res.end("{}");
});

// ── WebSocket server (using shared HTTP server) ───────────────────────────
const wss = new WebSocketServer({
  server: httpServer,
  verifyClient: ({ req }, done) => {
    const origin = req.headers.origin || "";
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return done(true);
    // Allow everything in dev for convenience if not specified or explicit 'development'
    if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") return done(true);
    done(false, 403, "Forbidden");
  },
});

wss.on("connection", (ws) => {
  let initialized = false;
  const limiter = makeRateLimiter(5);

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: "error", message: "Invalid JSON" });
      return;
    }

    if (msg.type === "join") {
      const { roomId, token, userId, videoUrl } = msg;
      const username =
        String(msg.username || "")
          .slice(0, 24)
          .trim() || `Guest-${userId?.slice(0, 4) || "????"}`;

      if (!roomId || !userId) {
        send(ws, { type: "error", message: "join requires roomId and userId" });
        return;
      }

      let room = rooms.get(roomId);
      const isHost = Boolean(token);

      if (!room) {
        room = getOrCreateRoom(roomId, videoUrl, userId, isHost ? token : "");
      } else if (isHost && !room.hostToken && token) {
        room.hostId = userId;
        room.hostToken = token;
        if (videoUrl) room.videoUrl = videoUrl;
      }

      if (isHost && room.hostToken && token !== room.hostToken) {
        send(ws, { type: "error", message: "Invalid host token" });
        return;
      }

      if (isHost && token === room.hostToken && room.hostId !== userId) {
        const prevHostId = room.hostId;
        room.hostId = userId;
        for (const [, m] of clientMeta) {
          if (m.roomId === roomId && m.userId === prevHostId) m.isHost = false;
        }
        broadcastAll(roomId, { type: "host_changed", newHostId: userId });
      }

      room.clients.add(ws);
      if (!room.joinOrder.includes(userId)) room.joinOrder.push(userId);
      clientMeta.set(ws, {
        userId,
        roomId,
        isHost: isHost && token === room.hostToken,
        username,
      });
      initialized = true;

      send(ws, { type: "state_update", state: publicState(room) });
      send(ws, { type: "participants", users: getRoomParticipants(room) });
      broadcast(
        roomId,
        { type: "user_joined", userId, username, count: room.clients.size },
        ws,
      );

      return;
    }

    if (!initialized) {
      send(ws, { type: "error", message: "Send join first" });
      return;
    }
    const meta = clientMeta.get(ws);
    const room = rooms.get(meta.roomId);
    if (!room) return;

    if (msg.type === "ping") {
      send(ws, { type: "pong", serverTime: Date.now() });
      return;
    }

    if (msg.type === "set_name") {
      const username = String(msg.username || "")
        .slice(0, 24)
        .trim();
      if (!username) return;
      meta.username = username;
      broadcastAll(meta.roomId, {
        type: "name_changed",
        userId: meta.userId,
        username,
      });
      return;
    }

    if (msg.type === "chat") {
      if (!limiter.allow()) return;
      const text = String(msg.text || "")
        .slice(0, 500)
        .trim();
      if (!text) return;
      broadcastAll(meta.roomId, {
        type: "chat",
        senderId: meta.userId,
        senderName: meta.username,
        text,
        ts: Date.now(),
      });
      return;
    }

    if (msg.type === "kick") {
      if (!meta.isHost) return;
      const targetId = msg.targetUserId;
      if (!targetId || targetId === meta.userId) return;
      for (const [targetWs, targetMeta] of clientMeta) {
        if (
          targetMeta.roomId === meta.roomId &&
          targetMeta.userId === targetId
        ) {
          send(targetWs, { type: "kicked" });
          setTimeout(() => targetWs.close(1000, "Kicked"), 100);
          break;
        }
      }
      return;
    }

    if (msg.type === "change_video") {
      if (!meta.isHost) return;
      const newUrl = String(msg.videoUrl || "").trim();
      if (!newUrl) return;
      room.videoUrl = newUrl;
      room.isPlaying = false;
      room.currentTime = 0;
      room.lastUpdated = Date.now();
      room.playbackRate = 1;
      broadcastAll(meta.roomId, {
        type: "state_update",
        state: publicState(room),
      });
      broadcastAll(meta.roomId, {
        type: "chat",
        senderId: "system",
        senderName: "System",
        text: "🎬 Host loaded a new video.",
        ts: Date.now(),
      });
      return;
    }

    const currentTime = Number(msg.currentTime ?? room.currentTime);
    if (msg.type === "play") {
      room.isPlaying = true;
      room.currentTime = currentTime;
      room.lastUpdated = Date.now();
      broadcastAll(meta.roomId, {
        type: "state_update",
        state: publicState(room),
      });
    } else if (msg.type === "pause") {
      room.isPlaying = false;
      room.currentTime = currentTime;
      room.lastUpdated = Date.now();
      broadcastAll(meta.roomId, {
        type: "state_update",
        state: publicState(room),
      });
    } else if (msg.type === "seek") {
      room.currentTime = currentTime;
      room.lastUpdated = Date.now();
      broadcastAll(meta.roomId, {
        type: "state_update",
        state: publicState(room),
      });
    } else if (msg.type === "speed") {
      const rate = Number(msg.rate);
      if ([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].includes(rate)) {
        room.playbackRate = rate;
        room.lastUpdated = Date.now();
        broadcastAll(meta.roomId, {
          type: "state_update",
          state: publicState(room),
        });
      }
    }
  });

  ws.on("close", () => {
    const meta = clientMeta.get(ws);
    limiter.destroy();
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (room) {
      room.clients.delete(ws);
      room.joinOrder = room.joinOrder.filter((id) => id !== meta.userId);
      if (room.clients.size === 0) {
        setTimeout(() => {
          if (room.clients.size === 0) rooms.delete(meta.roomId);
        }, 600_000);
      } else {
        broadcast(meta.roomId, {
          type: "user_left",
          userId: meta.userId,
          username: meta.username,
          count: room.clients.size,
        });
        if (meta.isHost) {
          const { roomId, userId: hostUserId } = meta;
          setTimeout(() => {
            const r = rooms.get(roomId);
            if (!r) return;
            if (r.joinOrder.includes(hostUserId)) return;
            if (r.hostId !== hostUserId) return;
            electNewHost(r);
          }, HOST_RECONNECT_GRACE_MS);
        }
      }
    }
    clientMeta.delete(ws);
  });

  ws.on("error", (err) => console.error("[ws] socket error", err.message));
});

httpServer.listen(PORT, "0.0.0.0", () =>
  console.log(`[ws] Integrated server listening on 0.0.0.0:${PORT}`),
);

setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms) {
    if (room.clients.size === 0 || !room.isPlaying) continue;
    if (now - room.lastUpdated < 6_000) continue;
    broadcastAll(roomId, { type: "state_update", state: publicState(room) });
  }
}, 5_000);

setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.readyState === WebSocket.OPEN) ws.ping();
  }
}, 30_000);

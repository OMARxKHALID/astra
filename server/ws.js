import { WebSocketServer, WebSocket } from "ws";
import http from "http";

const PORT = parseInt(process.env.PORT || process.env.WS_PORT || "3001", 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""));

const HOST_RECONNECT_GRACE_MS = 6000;
const rooms = new Map();
const clientMeta = new Map();

console.log(`[ws] Starting server on port ${PORT}...`);
console.log(`[ws] Allowed Origins: [${ALLOWED_ORIGINS.join(", ")}]`);

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
    console.log(`[ws] Creating new room: ${roomId}`);
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
        console.log(`[ws] [${room.roomId}] Electing new host: ${meta.username} (${userId})`);
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
      console.log(`[http] Meta query: Room ${rId} not found`);
      res.writeHead(404);
      return res.end("{}");
    }
    res.writeHead(200);
    return res.end(JSON.stringify(publicState(room)));
  }

  res.writeHead(404);
  res.end("{}");
});

const wss = new WebSocketServer({
  server: httpServer,
  verifyClient: ({ req }, done) => {
    const origin = (req.headers.origin || "").replace(/\/$/, "");
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === "development";

    if (!origin || ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes("*") || isDev) {
      return done(true);
    }

    console.warn(`[ws] Connection rejected: Origin "${origin}" not in allowed list.`);
    done(false, 403, "Forbidden");
  },
});

wss.on("connection", (ws, req) => {
  let initialized = false;
  const limiter = makeRateLimiter(5);
  const ip = req.socket.remoteAddress;

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
        console.log(`[ws] [${roomId}] Re-claiming host token for ${username}`);
        room.hostId = userId;
        room.hostToken = token;
        if (videoUrl) room.videoUrl = videoUrl;
      }

      if (isHost && room.hostToken && token !== room.hostToken) {
        console.warn(`[ws] [${roomId}] Join rejected: Invalid host token for ${username}`);
        send(ws, { type: "error", message: "Invalid host token" });
        return;
      }

      if (isHost && token === room.hostToken && room.hostId !== userId) {
        console.log(`[ws] [${roomId}] Original host ${username} re-joined. Reclaiming...`);
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

      console.log(`[ws] [${roomId}] ${username} joined (${room.clients.size} total) IP: ${ip}`);

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
      const oldName = meta.username;
      const username = String(msg.username || "")
        .slice(0, 24)
        .trim();
      if (!username) return;
      meta.username = username;
      console.log(`[ws] [${meta.roomId}] Name change: ${oldName} -> ${username}`);
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
      console.log(`[ws] [${meta.roomId}] Host ${meta.username} kicked ${targetId}`);
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
      console.log(`[ws] [${meta.roomId}] Video changed by ${meta.username}: ${newUrl}`);
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
      console.log(`[ws] [${meta.roomId}] Play at ${currentTime} by ${meta.username}`);
      room.isPlaying = true;
      room.currentTime = currentTime;
      room.lastUpdated = Date.now();
      broadcastAll(meta.roomId, {
        type: "state_update",
        state: publicState(room),
      });
    } else if (msg.type === "pause") {
      console.log(`[ws] [${meta.roomId}] Pause at ${currentTime} by ${meta.username}`);
      room.isPlaying = false;
      room.currentTime = currentTime;
      room.lastUpdated = Date.now();
      broadcastAll(meta.roomId, {
        type: "state_update",
        state: publicState(room),
      });
    } else if (msg.type === "seek") {
      console.log(`[ws] [${meta.roomId}] Seek to ${currentTime} by ${meta.username}`);
      room.currentTime = currentTime;
      room.lastUpdated = Date.now();
      broadcastAll(meta.roomId, {
        type: "state_update",
        state: publicState(room),
      });
    } else if (msg.type === "speed") {
      const rate = Number(msg.rate);
      if ([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].includes(rate)) {
        console.log(`[ws] [${meta.roomId}] Speed change: ${rate}x by ${meta.username}`);
        room.playbackRate = rate;
        room.lastUpdated = Date.now();
        broadcastAll(meta.roomId, {
          type: "state_update",
          state: publicState(room),
        });
      }
    }
  });

  ws.on("close", (code, reason) => {
    const meta = clientMeta.get(ws);
    limiter.destroy();
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (room) {
      room.clients.delete(ws);
      room.joinOrder = room.joinOrder.filter((id) => id !== meta.userId);
      console.log(`[ws] [${meta.roomId}] ${meta.username} left (${room.clients.size} total). Code: ${code} Reason: ${reason}`);

      if (room.clients.size === 0) {
        console.log(`[ws] [${meta.roomId}] Room empty. Scheduling deletion in 10 minutes...`);
        setTimeout(() => {
          if (room.clients.size === 0) {
            console.log(`[ws] [${meta.roomId}] Deleting dormant room.`);
            rooms.delete(meta.roomId);
          }
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
          console.log(`[ws] [${roomId}] Host left. Starting 6s grace period for re-election...`);
          setTimeout(() => {
            const r = rooms.get(roomId);
            if (!r) return;
            if (r.joinOrder.includes(hostUserId)) {
              console.log(`[ws] [${roomId}] Host re-joined within grace period. Election cancelled.`);
              return;
            }
            if (r.hostId !== hostUserId) return;
            electNewHost(r);
          }, HOST_RECONNECT_GRACE_MS);
        }
      }
    }
    clientMeta.delete(ws);
  });

  ws.on("error", (err) => console.error(`[ws] Socket Error (IP: ${ip}): ${err.message}`));
});

httpServer.listen(PORT, "0.0.0.0", () =>
  console.log(`\n🚀 [ws] SERVER ONLINE: 0.0.0.0:${PORT}\n`),
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

import { Server } from "socket.io";
import http from "http";
import { Redis } from "@upstash/redis";
import pkg from "@next/env";

const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd());

const redis = process.env.REDIS_KV_REST_API_URL
  ? new Redis({
      url: process.env.REDIS_KV_REST_API_URL,
      token: process.env.REDIS_KV_REST_API_TOKEN,
    })
  : null;

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
    this.video = video; // ref.md naming
    this.subtitleUrl = "";
    this.videoTS = 0; // ref.md naming
    this.paused = true; // ref.md naming
    this.lastUpdated = Date.now();
    this.hostId = hostId;
    this.hostToken = hostToken;
    this.playbackRate = 1;
    this.hostOnlyControls = false;
    this.clients = new Set(); 
    this.joinOrder = []; 
    this.messages = [];
    // THE HEART OF SYNC (from ref.md)
    this.tsMap = {}; 
    this.lastTsMap = Date.now(); 
    this.preventTSUpdate = false; 

    this.broadcastInterval = null;
  }

  startBroadcast(io) {
    if (this.broadcastInterval) return;
    this.broadcastInterval = setInterval(() => {
      this.lastTsMap = Date.now();
      
      const now = Date.now();
      if (!this.paused) {
          this.videoTS += ((now - this.lastUpdated) / 1000) * (this.playbackRate || 1);
      }
      this.lastUpdated = now;

      if (this.clients.size > 0) {
          io.to(this.roomId).emit("REC:tsMap", this.tsMap);
          io.to(this.roomId).emit("REC:host", this.publicState());
      }
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

    // Only increment this value to prevent a lagging viewer from holding up the room state
    if (rawTime > this.videoTS) {
        this.videoTS = rawTime;
    }

    // Normalize based on how long since the last tsMap broadcast (Watchparty +1s formula)
    const timeSinceTsMap = Date.now() - this.lastTsMap;
    const normalized = rawTime - (timeSinceTsMap / 1000) + 1;
    this.tsMap[userId] = normalized;
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

async function persistRoom(room) {
  if (!redis) return;
  try {
    await redis.set(
      `room:${room.roomId}`,
      {
        roomId: room.roomId,
        video: room.video,
        paused: room.paused,
        videoTS: room.videoTS,
        lastUpdated: room.lastUpdated,
        hostId: room.hostId,
        hostToken: room.hostToken,
        playbackRate: room.playbackRate,
        hostOnlyControls: room.hostOnlyControls ?? false,
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
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
  },
});

const clientMeta = new Map(); 

io.on("connection", (socket) => {
  socket.on("JOIN_ROOM", async (msg) => {
    const { roomId, token, clientId, videoUrl, username } = msg; 
    let room = rooms.get(roomId);

    if (!room && redis) {
        try {
            const stored = await redis.get(`room:${roomId}`);
            if (stored) {
                room = new Room(roomId, stored.video, stored.hostId, stored.hostToken);
                room.paused = stored.paused ?? true;
                room.videoTS = stored.videoTS ?? 0;
                room.playbackRate = stored.playbackRate ?? 1;
                room.hostOnlyControls = stored.hostOnlyControls ?? false;
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
        socket.emit("error", { message: "Invalid host token" });
        return;
    }

    if (isHost && token === room.hostToken && room.hostId !== clientId) {
        const prevHostId = room.hostId;
        room.hostId = clientId;
        for (const meta of clientMeta.values()) {
            if (meta.roomId === roomId && meta.userId === prevHostId) meta.isHost = false;
        }
        io.to(roomId).emit("host_changed", { newHostId: clientId });
    }

    socket.join(roomId);
    room.clients.add(socket.id);
    if (!room.joinOrder.includes(clientId)) room.joinOrder.push(clientId);
    
    clientMeta.set(socket.id, {
        userId: clientId,
        roomId,
        isHost: isHost && token === room.hostToken,
        username,
    });

    socket.emit("REC:host", room.publicState());
    socket.emit("REC:tsMap", room.tsMap);
    
    io.to(roomId).emit("roster", room.getParticipants(clientMeta));
    
    if (room.messages.length > 0) socket.emit("chat_history", { messages: room.messages });
    if (!room.hostId) electNewHost(room);
  });

  // Command Handlers
  const handleCmd = (socket, action) => {
    const meta = clientMeta.get(socket.id);
    if (!meta) return null;
    const room = rooms.get(meta.roomId);
    if (!room) return null;
    if (room.hostOnlyControls && !meta.isHost) return null;
    return { room, meta };
  };

  socket.on("CMD:ts", (time) => {
      const ctx = handleCmd(socket);
      if (ctx) ctx.room.receiveTimestamp(ctx.meta.userId, time);
  });

  socket.on("CMD:play", (msg) => {
    const ctx = handleCmd(socket);
    if (ctx) {
        ctx.room.paused = false;
        if (msg && typeof msg.videoTS === "number") ctx.room.videoTS = msg.videoTS;
        ctx.room.lastUpdated = Date.now();
        
        ctx.room.preventTSUpdate = true;
        setTimeout(() => { ctx.room.preventTSUpdate = false; }, 1000);

        io.to(ctx.room.roomId).emit("REC:play", { videoTS: ctx.room.videoTS });
        io.to(ctx.room.roomId).emit("REC:host", ctx.room.publicState());
        persistRoom(ctx.room);
    }
  });

  socket.on("CMD:pause", () => {
    const ctx = handleCmd(socket);
    if (ctx) {
        ctx.room.paused = true;
        ctx.room.lastUpdated = Date.now();

        ctx.room.preventTSUpdate = true;
        setTimeout(() => { ctx.room.preventTSUpdate = false; }, 1000);

        io.to(ctx.room.roomId).emit("REC:pause");
        io.to(ctx.room.roomId).emit("REC:host", ctx.room.publicState());
        persistRoom(ctx.room);
    }
  });

  socket.on("CMD:seek", (time) => {
    const ctx = handleCmd(socket);
    if (ctx) {
        ctx.room.videoTS = time;
        ctx.room.tsMap = {}; 
        ctx.room.lastUpdated = Date.now();
        
        ctx.room.preventTSUpdate = true;
        setTimeout(() => { ctx.room.preventTSUpdate = false; }, 1000);

        io.to(ctx.room.roomId).emit("REC:seek", time);
        io.to(ctx.room.roomId).emit("REC:host", ctx.room.publicState());
        persistRoom(ctx.room);
    }
  });

  socket.on("CMD:speed", (msg) => {
    const ctx = handleCmd(socket);
    if (ctx) {
        ctx.room.playbackRate = Number(msg.rate) || 1;
        if (msg.videoTS !== undefined) ctx.room.videoTS = Number(msg.videoTS);
        ctx.room.lastUpdated = Date.now();
        io.to(ctx.room.roomId).emit("REC:host", ctx.room.publicState());
        persistRoom(ctx.room);
    }
  });

  socket.on("CMD:host", (data) => {
    const meta = clientMeta.get(socket.id);
    if (meta?.isHost) {
        const room = rooms.get(meta.roomId);
        if (room) {
            room.changeVideo(data.video, data.videoTS || 0, data.paused || false, data.subtitleUrl || "");
            io.to(room.roomId).emit("REC:host", room.publicState());
            persistRoom(room);
        }
    }
  });

  socket.on("CMD:subtitle", (url) => {
    const ctx = handleCmd(socket);
    if (ctx) {
        ctx.room.subtitleUrl = url;
        io.to(ctx.room.roomId).emit("REC:subtitle", url);
        persistRoom(ctx.room);
    }
  });

  socket.on("set_name", (msg) => {
    const meta = clientMeta.get(socket.id);
    if (!meta) return;
    meta.username = String(msg.username || "").slice(0, 24).trim();
    io.to(meta.roomId).emit("name_changed", { userId: meta.userId, username: meta.username });
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
        text: String(msg.text || "").slice(0, 500).trim(),
        ts: Date.now(),
    };
    if (chatMsg.text) {
        room.messages.push(chatMsg);
        io.to(meta.roomId).emit("chat", chatMsg);
        persistRoom(room);
    }
  });

  socket.on("disconnect", () => {
    const meta = clientMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (room) {
        room.clients.delete(socket.id);
        room.joinOrder = room.joinOrder.filter(id => id !== meta.userId);
        delete room.tsMap[meta.userId];
        if (room.clients.size === 0) {
            persistRoom(room);
            setTimeout(() => { if (room.clients.size === 0) { room.stopBroadcast(); rooms.delete(room.roomId); } }, 600_000);
        } else {
            io.to(room.roomId).emit("user_left", { userId: meta.userId, username: meta.username, count: room.clients.size });
            if (meta.isHost) {
                setTimeout(() => {
                    const r = rooms.get(meta.roomId);
                    if (r && r.hostId === meta.userId && !r.joinOrder.includes(meta.userId)) electNewHost(r);
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
        persistRoom(room);
        return;
      }
    }
  }
}

httpServer.listen(PORT, "0.0.0.0", () =>
  console.log(`\n🚀 [socket.io] SERVER ONLINE: 0.0.0.0:${PORT}\n`),
);

import { Server } from "socket.io";
import http from "http";
import pkg from "@next/env";
import {
  DEBUG,
  SOCKET_PING_INTERVAL,
  SOCKET_PING_TIMEOUT,
} from "./constants.js";
import { saveRoom, deleteRoomFromRedis } from "./models/Room.js";
import { verifyAdminSecret } from "./utils/auth.js";
import registerChatHandlers from "./handlers/chatHandler.js";
import registerVideoHandlers from "./handlers/videoHandler.js";
import registerRoomHandlers from "./handlers/roomHandler.js";
import registerCallHandlers from "./handlers/callHandler.js";

const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd());

const PORT = parseInt(process.env.PORT || process.env.WS_PORT || "3001", 10);
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) =>
      o.trim().replace(/\/$/, ""),
    )
  : ["http://localhost:3000"];

const rooms = new Map();
const clientMeta = new Map();
const tsLastSent = new Map();

// [Note] Create bare httpServer first so io can be instantiated and bound to it
// before the request handler is registered. This prevents io from being
// undefined when the DELETE /rooms/:id handler executes.
const httpServer = http.createServer();

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      const normalized = origin?.replace(/\/$/, "");
      if (ALLOWED_ORIGINS.includes(normalized)) callback(null, true);
      else callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST"],
  },
  pingInterval: SOCKET_PING_INTERVAL,
  pingTimeout: SOCKET_PING_TIMEOUT,
  maxHttpBufferSize: 1e6,
});

// [Note] Request handler registered after io is fully initialized
httpServer.on("request", (req, res) => {
  const origin = req.headers.origin || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin.replace(/\/$/, ""));

  if (isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({ ok: true, rooms: rooms.size, clients: clientMeta.size }),
    );
  }

  const m = req.url?.match(/^\/rooms\/([^/?]+)/);
  if (m) {
    if (req.method === "DELETE") {
      if (!verifyAdminSecret(req.headers["x-admin-secret"])) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Unauthorized" }));
      }

      const roomId = m[1];
      const room = rooms.get(roomId);

      if (room) {
        for (const sid of [...room.socketIds]) {
          const s = io.sockets.sockets.get(sid);
          if (s) {
            s.emit("REC:error", {
              message: "Room terminated by administrator",
              code: "TERMINATED",
            });
            s.disconnect(true);
          }
        }
        room.stopBroadcast();
        rooms.delete(roomId);
      }

      deleteRoomFromRedis(roomId).catch(console.error);

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: true }));
    }

    const room = rooms.get(m[1]);
    if (!room) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end("{}");
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(room.publicState()));
  }

  if (req.url === "/stats") {
    if (!verifyAdminSecret(req.headers["x-admin-secret"])) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Unauthorized" }));
    }

    try {
      const roomList = [];
      for (const [roomId, room] of rooms) {
        roomList.push({
          roomId,
          video: room.video,
          participants: room.socketIds.size,
          hostId: room.hostId,
          createdAt: room.createdAt,
          lastUpdated: room.lastUpdated,
          isPaused: room.paused,
          messagesCount: room.messages?.length || 0,
        });
      }

      const userRooms = {};
      for (const [, meta] of clientMeta) {
        if (meta.roomId) {
          userRooms[meta.roomId] = (userRooms[meta.roomId] || 0) + 1;
        }
      }

      const topRooms = [...roomList]
        .sort((a, b) => b.participants - a.participants)
        .slice(0, 10);

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          rooms: rooms.size,
          users: clientMeta.size,
          userRooms,
          topRooms,
          allRooms: roomList.sort((a, b) => b.lastUpdated - a.lastUpdated),
          uptime: process.uptime(),
        }),
      );
    } catch (err) {
      console.error("[socket] Stats error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }
});

io.on("connection", (socket) => {
  socket.on("PING_CLOCK", (t0, ack) => {
    if (typeof ack === "function") ack(Date.now());
  });

  function getCtx(requireControl = true) {
    const meta = clientMeta.get(socket.id);
    if (!meta) return null;
    const room = rooms.get(meta.roomId);
    if (!room || (requireControl && room.hostOnlyControls && !meta.isHost))
      return null;
    return { room, meta };
  }

  registerChatHandlers(io, socket, rooms, clientMeta);
  registerVideoHandlers(io, socket, rooms, clientMeta, getCtx, tsLastSent);
  registerRoomHandlers(io, socket, rooms, clientMeta, electNewHost, tsLastSent);
  registerCallHandlers(io, socket, rooms, clientMeta);
});

function electNewHost(room) {
  const activeUsers = new Set(
    [...clientMeta.values()]
      .filter((m) => m.roomId === room.roomId)
      .map((m) => m.userId),
  );
  for (const userId of room.joinOrder) {
    if (activeUsers.has(userId)) {
      room.hostId = userId;
      for (const [, meta] of clientMeta.entries())
        if (meta.roomId === room.roomId && meta.userId === userId)
          meta.isHost = true;
      io.to(room.roomId).emit("host_changed", { newHostId: userId });
      saveRoom(room);
      return;
    }
  }
}

httpServer.listen(PORT, "0.0.0.0", () => {
  if (DEBUG) console.log(`[socket] ONLINE: 0.0.0.0:${PORT}`);
});

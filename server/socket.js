import { Server } from "socket.io";
import http from "http";
import pkg from "@next/env";
import { SOCKET_PING_INTERVAL, SOCKET_PING_TIMEOUT } from "./constants.js";
import { saveRoom } from "./models/Room.js";
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

const httpServer = http.createServer((req, res) => {
  const origin = req.headers.origin || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin.replace(/\/$/, ""));
  
  if (isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  // Only handle our specific health/info routes. 
  // DO NOT res.end() for any other path so Socket.io can handle its own traffic.
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({ ok: true, rooms: rooms.size, clients: clientMeta.size }),
    );
  }

  const m = req.url?.match(/^\/rooms\/([^/?]+)/);
  if (m) {
    const room = rooms.get(m[1]);
    if (!room) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end("{}");
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(room.publicState()));
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ["GET", "POST"],
  },
  pingInterval: SOCKET_PING_INTERVAL,
  pingTimeout: SOCKET_PING_TIMEOUT,
  maxHttpBufferSize: 1e6,
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

httpServer.listen(PORT, "0.0.0.0", () =>
  console.log(`\n🚀 [socket.io] ONLINE: 0.0.0.0:${PORT}\n`),
);

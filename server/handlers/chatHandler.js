import { saveRoom } from "../models/Room.js";
import { MAX_DATAURL_BYTES } from "../constants.js";

export default function registerChatHandlers(io, socket, rooms, clientMeta) {
  socket.on("CMD:setName", (_rId, msg) => {
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

  socket.on("CMD:typing", (_rId) => {
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

    io.to(meta.roomId).emit("chat", chatMsg);

    const isAudio = dataUrl?.startsWith("data:audio/");
    if (text || isAudio) {
      const storedMsg = { ...chatMsg };
      if (dataUrl && !isAudio) {
        storedMsg.dataUrl = undefined;
      }
      room.messages.push(storedMsg);
      if (room.messages.length > 200) room.messages = room.messages.slice(-200);
      saveRoom(room);
    }
  });
}

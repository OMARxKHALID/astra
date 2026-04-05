export default function registerCallHandlers(io, socket, rooms, clientMeta) {
  function getSocketByUserId(userId, roomId) {
    for (const [sid, meta] of clientMeta.entries()) {
      if (meta.userId === userId && meta.roomId === roomId) return sid;
    }
    return null;
  }

  socket.on("CALL:join", (roomId) => {
    const meta = clientMeta.get(socket.id);
    if (!meta || meta.roomId !== roomId) return;
    socket.to(roomId).emit("CALL:user_joined", { userId: meta.userId });
  });

  socket.on("CALL:leave", (roomId) => {
    const meta = clientMeta.get(socket.id);
    if (!meta || meta.roomId !== roomId) return;
    socket.to(roomId).emit("CALL:user_left", { userId: meta.userId });
  });

  socket.on("CALL:offer", (roomId, msg) => {
    const meta = clientMeta.get(socket.id);
    const targetSid = getSocketByUserId(msg.to, roomId);
    if (!meta || meta.roomId !== roomId || !targetSid) return;
    io.to(targetSid).emit("CALL:offer", { from: meta.userId, offer: msg.offer });
  });

  socket.on("CALL:answer", (roomId, msg) => {
    const meta = clientMeta.get(socket.id);
    const targetSid = getSocketByUserId(msg.to, roomId);
    if (!meta || meta.roomId !== roomId || !targetSid) return;
    io.to(targetSid).emit("CALL:answer", { from: meta.userId, answer: msg.answer });
  });

  socket.on("CALL:ice", (roomId, msg) => {
    const meta = clientMeta.get(socket.id);
    const targetSid = getSocketByUserId(msg.to, roomId);
    if (!meta || meta.roomId !== roomId || !targetSid) return;
    io.to(targetSid).emit("CALL:ice", { from: meta.userId, candidate: msg.candidate });
  });

  socket.on("CALL:status", (roomId, msg) => {
    const meta = clientMeta.get(socket.id);
    if (!meta || meta.roomId !== roomId) return;
    socket.to(roomId).emit("CALL:status", { from: meta.userId, ...msg });
  });
}

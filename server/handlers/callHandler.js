export default function registerCallHandlers(io, socket, rooms, clientMeta) {
  socket.on("CALL:offer", (_rId, offerData) => {
    const meta = clientMeta.get(socket.id);
    if (!meta) return;
    socket.to(meta.roomId).emit("CALL:offer", {
      ...offerData,
      from: meta.userId,
    });
  });

  socket.on("CALL:answer", (_rId, answerData) => {
    const meta = clientMeta.get(socket.id);
    if (!meta) return;
    socket.to(meta.roomId).emit("CALL:answer", {
      ...answerData,
      from: meta.userId,
    });
  });

  socket.on("CALL:ice", (_rId, iceData) => {
    const meta = clientMeta.get(socket.id);
    if (!meta) return;
    socket.to(meta.roomId).emit("CALL:ice", {
      ...iceData,
      from: meta.userId,
    });
  });
}

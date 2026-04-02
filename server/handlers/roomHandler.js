import { Room, saveRoom, cleanupRoom } from "../models/Room.js";
import { verifyHostToken, hashPassword } from "../utils/auth.js";
import {
  EMPTY_ROOM_CLEANUP_MS,
  HOST_RECONNECT_GRACE_MS,
} from "../constants.js";
import { redis } from "../utils/redis.js";

export default function registerRoomHandlers(
  io,
  socket,
  rooms,
  clientMeta,
  electNewHost,
  tsLastSent,
) {
  socket.on("JOIN_ROOM", async (msg) => {
    const { roomId, token, clientId, videoUrl, username, password } = msg || {};
    console.log(
      `[socket] JOIN_ROOM: room=${roomId} user=${clientId} hasToken=${!!token}`,
    );

    if (!roomId || !clientId) {
      console.warn(`[socket] JOIN_ROOM aborted: missing roomId or clientId`);
      return;
    }

    let room = rooms.get(roomId);

    if (!room && redis) {
      try {
        const stored = await redis.get(`room:${roomId}`);
        if (stored) {
          console.log(`[redis] Restoring room:${roomId} from storage`);
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
          room.messages = (stored.messages || []).filter(
            (m) => m.text || (m.dataUrl && m.dataUrl.startsWith("data:audio/")),
          );
          room.lastUpdated = stored.lastUpdated ?? Date.now();
          rooms.set(roomId, room);
          room.startBroadcast(io);
        }
      } catch (err) {
        // [Note] Silent fail on read: fall back to volatile room creation
      }
    }

    const isHost = Boolean(token);
    const jwtPayload = isHost ? verifyHostToken(token, roomId) : false;

    if (isHost) {
      if (jwtPayload) {
        console.log(
          `[auth] Valid host token for room:${roomId} user:${jwtPayload.hostId}`,
        );
      } else {
        console.error(
          `[auth] INVALID host token for room:${roomId} user:${clientId}`,
        );
      }
    }

    if (!room) {
      room = new Room(
        roomId,
        videoUrl || "",
        jwtPayload?.hostId || clientId,
        isHost ? token : "",
      );
      rooms.set(roomId, room);
      room.startBroadcast(io);
    } else if (isHost && !room.hostToken && token && jwtPayload) {
      room.hostId = jwtPayload.hostId || clientId;
      room.hostToken = token;
      if (videoUrl) room.video = videoUrl;
    }

    if (isHost && !jwtPayload)
      return socket.emit("REC:error", { message: "Invalid host token" });

    if (room.passwordHash && !isHost) {
      if (!password) {
        return socket.emit("REC:error", {
          message: "Password required",
          code: "NEED_PASSWORD",
        });
      }
      const provided = hashPassword(String(password));
      if (provided !== room.passwordHash) {
        return socket.emit("REC:error", {
          message: "Wrong password",
          code: "WRONG_PASSWORD",
        });
      }
    }

    const effectiveHostId = jwtPayload?.hostId || clientId;
    if (isHost && jwtPayload && room.hostId !== effectiveHostId) {
      const prev = room.hostId;
      room.hostId = effectiveHostId;
      for (const meta of clientMeta.values())
        if (meta.roomId === roomId && meta.userId === prev) meta.isHost = false;
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

    socket.emit("REC:host", { ...room.publicState(), reconnected: !wasNew });
    socket.emit("REC:tsMap", { ...room.tsMap });
    if (room.messages.length > 0) {
      socket.emit("chat_history", {
        type: "chat_history",
        messages: room.messages.map((m) => ({
          ...m,
          dataUrl: m.dataUrl?.startsWith("data:audio/") ? m.dataUrl : undefined,
        })),
      });
    }

    io.to(roomId).emit("REC:roster", room.getParticipants());
    console.log(`[socket] User joined room:${roomId} as ${displayName} (${clientId})`);
    if (wasNew)
      socket
        .to(roomId)
        .emit("user_joined", { userId: clientId, username: displayName });
    if (!room.hostId) electNewHost(room);
  });

  socket.on("CMD:lock", (_rId) => {
    const meta = clientMeta.get(socket.id);
    if (!meta?.isHost) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    room.hostOnlyControls = !room.hostOnlyControls;
    io.to(room.roomId).emit("REC:host", room.publicState());
    saveRoom(room);
  });

  socket.on("CMD:strictVideoUrlMode", (_rId) => {
    const meta = clientMeta.get(socket.id);
    if (!meta?.isHost) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    room.strictVideoUrlMode = !room.strictVideoUrlMode;
    io.to(room.roomId).emit("REC:host", room.publicState());
    saveRoom(room);
  });

  socket.on("CMD:setPassword", (_rId, msg) => {
    const meta = clientMeta.get(socket.id);
    if (!meta?.isHost) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const pw = msg?.password ? String(msg.password).trim().slice(0, 64) : "";
    room.passwordHash = pw ? hashPassword(pw) : "";
    io.to(room.roomId).emit("REC:host", room.publicState());
    saveRoom(room);
  });

  socket.on("CMD:kick", (_rId, msg) => {
    const meta = clientMeta.get(socket.id);
    if (!meta?.isHost) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;

    const { targetUserId } = msg || {};
    if (!targetUserId || targetUserId === meta.userId) return;

    for (const sid of room.socketIds) {
      const m = clientMeta.get(sid);
      if (m && m.userId === targetUserId) {
        io.to(sid).emit("REC:error", {
          message: "You have been removed from the room.",
        });
        io.sockets.sockets.get(sid)?.disconnect(true);
      }
    }
  });

  socket.on("CMD:transferHost", (_rId, msg) => {
    const meta = clientMeta.get(socket.id);
    if (!meta?.isHost) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const { targetUserId } = msg || {};
    if (!targetUserId || targetUserId === meta.userId) return;
    let found = false;
    for (const m of clientMeta.values())
      if (m.roomId === meta.roomId && m.userId === targetUserId) {
        found = true;
        break;
      }
    if (!found) return;
    meta.isHost = false;
    for (const m of clientMeta.values())
      if (m.roomId === meta.roomId && m.userId === targetUserId)
        m.isHost = true;
    room.hostId = targetUserId;
    io.to(room.roomId).emit("host_changed", {
      newHostId: targetUserId,
      transferredFrom: meta.userId,
    });
    saveRoom(room);
  });

  socket.on("disconnect", () => {
    const meta = clientMeta.get(socket.id);
    if (!meta) return;
    clientMeta.delete(socket.id);
    tsLastSent.delete(socket.id);
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const fullyLeft = room.removeSocket(socket.id, meta.userId);
    if (room.socketIds.size === 0) {
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
}

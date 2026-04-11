import { redis } from "../utils/redis.js";
import { SAVE_DEBOUNCE_MS, REDIS_TTL_S } from "../constants.js";

export function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export class Room {
  #broadcastTimer = null;
  #lastBcastState = null;
  #tsLockUntil = 0;
  #lastBroadcastTime = Date.now();
  #tsUpdateMap = new Map();

  constructor(roomId, videoUrl = "", hostId = "", hostToken = "") {
    this.roomId = roomId;
    this.videoUrl = videoUrl;
    this.subtitleUrl = "";
    this.videoTS = 0;
    this.paused = true;
    this.tmdbMeta = null;
    this.lastUpdated = Date.now();
    this.createdAt = Date.now();
    this.hostId = hostId;
    this.hostToken = hostToken;
    this.playbackRate = 1;
    this.hostOnlyControls = false;
    this.strictVideoUrlMode = false;
    this.passwordHash = "";

    this.joinOrder = [];
    this.usernames = new Map();
    this.connCounts = new Map();
    this.socketIds = new Set();

    this.tsMap = {};
    this.messages = [];
  }

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
      return true;
    }
    this.connCounts.set(userId, count);
    return false;
  }

  getParticipants() {
    return this.joinOrder.map((uid) => ({
      userId: uid,
      username: this.usernames.get(uid) || `Guest-${uid.slice(0, 4)}`,
    }));
  }

  lockTs(ms = 1500) {
    this.#tsLockUntil = Date.now() + ms;
  }

  receiveTimestamp(userId, time, isHost = false, clientTs = null) {
    if (Date.now() < this.#tsLockUntil) return;
    if (typeof time !== "number" || time < 0) return;

    const staleness = clientTs
      ? (Date.now() - clientTs) / 1000
      : (Date.now() - this.#lastBroadcastTime) / 1000;
    const normalized = Math.max(0, time + (this.paused ? 0 : staleness));

    this.tsMap[userId] = normalized;
    this.#tsUpdateMap.set(userId, Date.now());
  }

  changeVideo(videoUrl, videoTS = 0, paused = false, subtitleUrl = "") {
    this.videoUrl = videoUrl;
    this.videoTS = videoTS;
    this.paused = paused;
    this.subtitleUrl = subtitleUrl || "";
    this.tmdbMeta = null;
    this.tsMap = {};
    this.lockTs(1500);
    this.lastUpdated = Date.now();
  }

  publicState() {
    return {
      roomId: this.roomId,
      videoUrl: this.videoUrl,
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

  _stateFingerprint() {
    return JSON.stringify([
      this.videoUrl,
      this.paused,
      this.playbackRate,
      this.hostId,
      this.hostOnlyControls,
      this.tmdbMeta?.id,
      this.subtitleUrl,
    ]);
  }

  startBroadcast(io) {
    if (this.#broadcastTimer) return;
    this.#broadcastTimer = setInterval(() => {
      if (this.socketIds.size === 0) return;

      const validUsers = new Set(this.joinOrder);
      const now = Date.now();
      for (const uid of Object.keys(this.tsMap)) {
        const lastUpd = this.#tsUpdateMap.get(uid) || 0;
        if (!validUsers.has(uid) || now - lastUpd > 5000) {
          delete this.tsMap[uid];
          this.#tsUpdateMap.delete(uid);
        }
      }

      const times = Object.values(this.tsMap)
        .filter((t) => typeof t === "number")
        .sort((a, b) => a - b);

      let leaderTime = this.videoTS;
      if (times.length > 2) {
        leaderTime = times[Math.floor(times.length / 2)];
      } else if (times.length === 2) {
        // [Note] Average for 2 users prevents the 'chase' bias where everyone jumps to the fastest user
        leaderTime = (times[0] + times[1]) / 2;
      } else if (times.length === 1) {
        leaderTime = times[0];
      }

      io.to(this.roomId).emit("REC:tsMap", {
        ...this.tsMap,
        _leaderTime_: leaderTime,
      });
      this.#lastBroadcastTime = Date.now();

      const fp = this._stateFingerprint();
      if (fp !== this.#lastBcastState) {
        io.to(this.roomId).emit("REC:host", this.publicState());
        this.#lastBcastState = fp;
      }
    }, 1000);
  }

  stopBroadcast() {
    clearInterval(this.#broadcastTimer);
    this.#broadcastTimer = null;
  }
}

const debouncedSaveMap = new Map();

export async function saveRoom(room) {
  if (!redis) return;

  let saver = debouncedSaveMap.get(room.roomId);
  if (!saver) {
    saver = debounce(async (r) => {
      try {
        const payload = {
          roomId: r.roomId,
          videoUrl: r.videoUrl,
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
          messages: (r.messages || []).slice(-50).map((m) => ({
            ...m,
            dataUrl: m.dataUrl?.startsWith("data:audio/")
              ? m.dataUrl
              : undefined,
          })),
        };
        await redis.set(`room:${r.roomId}`, payload, { ex: REDIS_TTL_S });
      } catch (err) {
        console.error(
          `[redis] Persistence failed for ${r.roomId}: ${err.message}`,
        );
      }
    }, SAVE_DEBOUNCE_MS);
    debouncedSaveMap.set(room.roomId, saver);
  }

  saver(room);
}

export function cleanupRoom(roomId) {
  debouncedSaveMap.delete(roomId);
}

export async function deleteRoomFromRedis(roomId) {
  if (redis) {
    try {
      await redis.del(`room:${roomId}`);
    } catch (err) {
      console.error(`[redis] Delete failed for ${roomId}: ${err.message}`);
    }
  }
}

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
  constructor(roomId, video = "", hostId = "", hostToken = "") {
    this.roomId = roomId;
    this.video = video;
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
    this.tsLockUntil = 0;
    this.lastBroadcastTime = Date.now();

    this.messages = [];
    this.broadcastTimer = null;
    this.lastBcastState = null;
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
    this.tsLockUntil = Date.now() + ms;
  }

  receiveTimestamp(userId, time, isHost = false, clientTs = null) {
    if (Date.now() < this.tsLockUntil) return;
    if (typeof time !== "number" || time < 0) return;
    
    const staleness = clientTs 
      ? (Date.now() - clientTs) / 1000 
      : (Date.now() - this.lastBroadcastTime) / 1000;
    const normalized = Math.max(0, time - staleness);

    // [Note] Security: If host-only mode is on, guests can only report their own pos
    // and cannot push the "Master" room time forward.
    const canAffectMaster = !this.hostOnlyControls || isHost;
    if (canAffectMaster && normalized > this.videoTS) {
      this.videoTS = normalized;
      this.lastUpdated = Date.now();
    }
    
    this.tsMap[userId] = normalized;
  }

  changeVideo(video, videoTS = 0, paused = false, subtitleUrl = "") {
    this.video = video;
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
      video: this.video,
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

  // Lightweight fingerprint — only broadcast REC:host when something changed
  _stateFingerprint() {
    return `${this.video}|${this.videoTS.toFixed(1)}|${this.paused}|${this.playbackRate}|${this.hostId}|${this.hostOnlyControls}|${this.strictVideoUrlMode}|${Boolean(this.passwordHash)}|${this.tmdbMeta?.id || ""}|${this.subtitleUrl || ""}`;
  }

  startBroadcast(io) {
    if (this.broadcastTimer) return;
    this.broadcastTimer = setInterval(() => {
      if (this.socketIds.size === 0) return;

      // tsMap: prune entries for users no longer in room
      const validUsers = new Set(this.joinOrder);
      for (const uid of Object.keys(this.tsMap)) {
        if (!validUsers.has(uid)) delete this.tsMap[uid];
      }

      const times = Object.values(this.tsMap)
        .filter((t) => typeof t === "number")
        .sort((a, b) => a - b);
      const leaderTime = times.length
        ? times[Math.floor(times.length / 2)]
        : this.videoTS;

      io.to(this.roomId).emit("REC:tsMap", {
        ...this.tsMap,
        _leaderTime_: leaderTime,
      });
      this.lastBroadcastTime = Date.now();

      const fp = this._stateFingerprint();
      if (fp !== this.lastBcastState) {
        io.to(this.roomId).emit("REC:host", this.publicState());
        this.lastBcastState = fp;
      }
    }, 1000);
  }

  stopBroadcast() {
    clearInterval(this.broadcastTimer);
    this.broadcastTimer = null;
  }
}

const debouncedSave = new Map();

export function saveRoom(room) {
  if (!redis) return;
  if (!debouncedSave.has(room.roomId)) {
    debouncedSave.set(
      room.roomId,
      debounce(async (r) => {
        try {
          await redis.set(
            `room:${r.roomId}`,
            {
              roomId: r.roomId,
              video: r.video,
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
              // Only store text messages and audio dataUrls — drop image dataUrls
              messages: (r.messages || []).map((m) => ({
                ...m,
                dataUrl: m.dataUrl?.startsWith("data:audio/")
                  ? m.dataUrl
                  : undefined,
              })),
            },
            { ex: REDIS_TTL_S },
          );
        } catch (err) {
          console.error(`[redis] Save failed ${r.roomId}: ${err.message}`);
        }
      }, SAVE_DEBOUNCE_MS),
    );
  }
  debouncedSave.get(room.roomId)(room);
}

export function cleanupRoom(roomId) {
  debouncedSave.delete(roomId);
}

"use client";

import { useEffect, useRef, useCallback } from "react";
import io from "socket.io-client";
import {
  getLeaderTime,
  computeCorrection,
  expectedTime,
  SYNC_CHECK_INTERVAL,
  SYNC_TOLERANCE_S,
} from "@/lib/syncManager";
import { CLOCK_RECAL_INTERVAL } from "@/constants/config";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://watch-together-ws.onrender.com"
    : `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:3001`);

export default function SyncEngine({
  roomId,
  userId,
  hostToken,
  videoUrl,
  displayName,
  videoRef,
  onStateUpdate,
  onChatMessage,
  onUserChange,
  participants,
  onDriftStatus,
  onConnStatus,
  onKicked,
  sendRef,
  socketRef: externalSocketRef,
  onReconnected,
  roomPassword,
  speedSyncEnabled,
}) {
  // [Note] Closure guard: p.current holds current props to bypass stale hook closures
  const p = useRef();
  p.current = {
    roomId,
    userId,
    hostToken,
    videoUrl,
    displayName,
    videoRef,
    participants: participants || [],
    onStateUpdate,
    onChatMessage,
    onUserChange,
    onDriftStatus,
    onConnStatus,
    onKicked,
    onTsMapUpdate,
    onLateJoin,
    onReconnected,
    roomPassword,
    speedSyncEnabled,
    isHost: room.serverState?.hostId === userId,
  };

  const socketRef = useRef(null);
  const serverLine = useRef(null);
  const timer = useRef(null);
  const tsMap = useRef({});
  const isBuffering = useRef(false);
  const lastStatus = useRef("synced");
  const preventUpdateEnd = useRef(0);
  const clockOffset = useRef(0);
  const initialSeekDone = useRef(false);

  // [Note] native suppress: prevents loop-driven v.play() from re-triggering CMD:play
  const suppressNativeRef = useRef(false);

  useEffect(() => {
    const v = videoRef?.current;
    if (!v) return;
    v._suppressNative = false;
  }, [videoRef]);

  function suppressNext() {
    suppressNativeRef.current = true;
    const v = videoRef?.current;
    if (v) v._suppressNative = true;
    setTimeout(() => {
      suppressNativeRef.current = false;
      const vv = videoRef?.current;
      if (vv) vv._suppressNative = false;
    }, 150);
  }

  const isBufferingNow = useCallback((v) => {
    if (isBuffering.current) return true;
    if (v && typeof v.isBuffering !== "undefined")
      return Boolean(v.isBuffering);
    return false;
  }, []);

  const preventSync = useCallback((ms = 1000) => {
    preventUpdateEnd.current = Date.now() + ms;
  }, []);

  const send = useCallback(
    (type, data) => {
      const socket = socketRef.current;
      const roomId = p.current.roomId;
      
      
      if (!socket) {
        console.error("[SyncEngine] Cannot dispatch: socket is null");
        return;
      }

      if (type.startsWith("CMD:")) {
        socket.emit(type, roomId, data);
      } else {
        socket.emit(type, data);
      }

      if (
        ["CMD:play", "CMD:pause", "CMD:host", "CMD:playbackRate"].includes(type)
      )
        preventSync(1000);
      if (type === "CMD:seek") preventSync(3000);
    },
    [preventSync],
  );

  useEffect(() => {
    if (!sendRef) return;
    sendRef.current = (msg) => {
      if (msg.type === "chat")
        send("chat", { text: msg.text, dataUrl: msg.dataUrl });
      else if (msg.type === "play")
        send("CMD:play", { videoTS: msg.currentTime });
      else if (msg.type === "pause")
        send("CMD:pause", { videoTS: msg.currentTime });
      else if (msg.type === "seek") send("CMD:seek", msg.currentTime);
      else if (msg.type === "speed")
        send("CMD:playbackRate", { rate: msg.rate, videoTS: msg.currentTime });
      else if (msg.type === "change_video")
        send("CMD:host", {
          video: msg.videoUrl,
          videoUrl: msg.videoUrl,
          subtitleUrl: msg.subtitleUrl,
          paused: false,
          token: p.current.hostToken,
        });
      else if (msg.type === "kick")
        send("CMD:kick", { targetUserId: msg.targetUserId });
      else if (msg.type === "transfer_host")
        send("CMD:transferHost", { targetUserId: msg.targetUserId });
      else if (msg.type === "toggle_host_controls") send("CMD:lock");
      else if (msg.type === "toggle_strict_video_url_mode")
        send("CMD:strictVideoUrlMode");
      else if (msg.type === "set_subtitle") send("CMD:subtitle", msg.url);
      else if (msg.type === "set_name")
        send("CMD:setName", { username: msg.username });
      else if (msg.type === "set_password")
        send("CMD:setPassword", { password: msg.password });
      else if (msg.type === "typing") send("CMD:typing");
      else send(msg.type, msg);
    };
  }, [send, sendRef]);

  // [Note] Periodic pos report: notifies server of current TS for leader calc
  useEffect(() => {
    const int = setInterval(() => {
      const v = videoRef?.current;
      const socket = socketRef.current;
      if (v && !v.paused && !isBufferingNow(v) && socket?.connected) {
        socket.emit("CMD:ts", p.current.roomId, {
          currentTime: v.currentTime,
          clientId: p.current.userId,
        });
      }
    }, 1000);
    return () => clearInterval(int);
  }, [videoRef, isBufferingNow]);

  useEffect(() => {
    const v = videoRef?.current;
    if (!v || typeof v.addEventListener !== "function") return;
    const on = () => {
      isBuffering.current = true;
    };
    const off = () => {
      isBuffering.current = false;
    };
    v.addEventListener("waiting", on);
    v.addEventListener("canplay", off);
    v.addEventListener("playing", off);
    return () => {
      v.removeEventListener("waiting", on);
      v.removeEventListener("canplay", off);
      v.removeEventListener("playing", off);
    };
  }, [videoRef]);

  // [Note] Core sync logic: runs at SYNC_CHECK_INTERVAL (200ms) to steer player position/rate
  const loop = useCallback(() => {
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      const { videoRef: vr, onDriftStatus: od } = p.current;
      const v = vr?.current;
      const s = serverLine.current;
      if (!v || !s) return;

      const inPreventWindow = Date.now() < preventUpdateEnd.current;

      if (!inPreventWindow) {
        if (s.isPlaying && v.paused && !isBufferingNow(v)) {
          suppressNext();
          v.play().catch(() => {});
        } else if (!s.isPlaying && !v.paused) {
          suppressNext();
          v.pause();
        }
      }

      const targetRate = s.playbackRate || 1;
      if (v.readyState < 3 || isBufferingNow(v) || inPreventWindow) {
        if (Math.abs(v.playbackRate - targetRate) > 0.005)
          v.playbackRate = targetRate;
        return;
      }

      const lt = tsMap.current._leaderTime_ ?? 0;
      const target = expectedTime(s, clockOffset.current);
      const leaderTime = lt > 0 ? lt : target;
      if (leaderTime === 0) return;

      const drift = leaderTime - v.currentTime;
      const newStatus = Math.abs(drift) <= SYNC_TOLERANCE_S ? "synced" : "soft";
      if (newStatus !== lastStatus.current) {
        lastStatus.current = newStatus;
        od?.(newStatus);
      }

      if (!initialSeekDone.current && Math.abs(drift) > 1) {
        v.currentTime = leaderTime;
        initialSeekDone.current = true;
      }

      // [Note] Steering: adjust rate between 0.9x and 1.1x based on drift magnitude
      const correction = computeCorrection(
        v.currentTime,
        leaderTime,
        s.isPlaying,
      );
      const isCurrentHost = s?.hostId === p.current.userId;
      const commandedRate = p.current.speedSyncEnabled !== false || isCurrentHost ? (s.playbackRate || 1) : 1;

      const correctedRate =
        correction.action === "soft"
          ? parseFloat(
              Math.min(
                commandedRate + (correction.playbackRate - 1),
                commandedRate + 0.1,
              ).toFixed(3),
            )
          : commandedRate;
      if (Math.abs(v.playbackRate - correctedRate) > 0.005)
        v.playbackRate = correctedRate;

      if (!inPreventWindow) {
        if (s.isPlaying && v.paused) {
          suppressNext();
          v.play().catch(() => {});
        } else if (!s.isPlaying && !v.paused) {
          suppressNext();
          v.pause();
        }
      }
    }, SYNC_CHECK_INTERVAL);
  }, [isBufferingNow]);

  const connect = useCallback(() => {
    const {
      roomId,
      userId,
      hostToken,
      videoUrl,
      displayName,
      roomPassword,
      onConnStatus,
    } = p.current;

    if (socketRef.current) socketRef.current.disconnect();

    const socket = io(WS_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    socketRef.current = socket;
    if (externalSocketRef) externalSocketRef.current = socket;

    socket.on("connect", () => {
      onConnStatus?.("connected");
      socket.emit("JOIN_ROOM", {
        roomId,
        clientId: userId,
        username: displayName,
        token: hostToken || undefined,
        videoUrl: videoUrl || "",
        password: roomPassword || undefined,
      });
      loop();

      // [Note] Clock sync: measures RTT/2 delta between client and server monotonic clocks
      function calibrateClock() {
        const t0 = Date.now();
        socket.emit("PING_CLOCK", t0, (serverTime) => {
          if (typeof serverTime !== "number") return;
          const rtt = Date.now() - t0;
          clockOffset.current = serverTime + rtt / 2 - Date.now();
        });
      }
      calibrateClock();
      const clockTimer = setInterval(calibrateClock, CLOCK_RECAL_INTERVAL);
      socket.once("disconnect", () => clearInterval(clockTimer));
    });

    const handlers = {
      disconnect: () => onConnStatus?.("reconnecting"),
      connect_error: () => onConnStatus?.("reconnecting"),

      "REC:host": (m) => {
        const state = {
          ...m,
          videoUrl: m.video,
          isPlaying: !m.paused,
          currentTime: m.videoTS,
        };
        const wasInitial = !serverLine.current;
        const prev = serverLine.current;
        serverLine.current = state;

        p.current.onStateUpdate?.(state);

        if (!wasInitial && prev) {
          const ocm = p.current.onChatMessage;
          if (prev.strictVideoUrlMode !== m.strictVideoUrlMode)
            ocm?.({
              senderId: "system",
              ts: Date.now(),
              text: m.strictVideoUrlMode
                ? "[STRICT_ON] Strict URL mode ON — direct files only."
                : "[STRICT_OFF] Strict URL mode OFF — all URLs allowed.",
            });
          if (prev.hostOnlyControls !== m.hostOnlyControls)
            ocm?.({
              senderId: "system",
              ts: Date.now(),
              text: m.hostOnlyControls
                ? "[LOCK] Playback locked to host only."
                : "[UNLOCK] Playback unlocked for everyone.",
            });
          if (Boolean(prev.hasPassword) !== Boolean(m.hasPassword))
            ocm?.({
              senderId: "system",
              ts: Date.now(),
              text: m.hasPassword
                ? "[LOCK] Room password set."
                : "[UNLOCK] Room password removed.",
            });
        }

        if (wasInitial) initialSeekDone.current = false;
        if (Date.now() < preventUpdateEnd.current) return;
        const v = p.current.videoRef?.current;

        if (wasInitial && v && state.currentTime > 0) {
          v.currentTime = state.currentTime;
          initialSeekDone.current = true;
          if (state.isPlaying) {
            suppressNext();
            v.play().catch(() => {});
          }
          if (m.reconnected) p.current.onReconnected?.();
          else if (state.currentTime > 120)
            p.current.onLateJoin?.(state.currentTime);
        }
      },

      "REC:play": (m) => {
        const v = p.current.videoRef?.current;
        if (v) {
          if (m?.videoTS != null && Math.abs(v.currentTime - m.videoTS) > 0.5)
            v.currentTime = m.videoTS;
          suppressNext();
          v.play().catch(() => {});
        }
      },

      "REC:pause": () => {
        const v = p.current.videoRef?.current;
        if (v && !v.paused) {
          suppressNext();
          v.pause();
        }
      },

      "REC:seek": (time) => {
        const v = p.current.videoRef?.current;
        if (v && Math.abs(v.currentTime - time) > 0.5) v.currentTime = time;
        if (Date.now() < preventUpdateEnd.current) return;
        const mins = Math.floor(time / 60);
        const secs = String(Math.floor(time % 60)).padStart(2, "0");
        p.current.onChatMessage?.({
          senderId: "system",
          ts: Date.now(),
          text: `[SEEK] Host jumped to ${mins}:${secs}`,
        });
      },

      "REC:tsMap": (data) => {
        tsMap.current = data;
        p.current.onTsMapUpdate?.(data);
      },
      "REC:roster": (users) =>
        p.current.onUserChange?.({ type: "participants", users }),
      user_joined: (m) =>
        p.current.onUserChange?.({ type: "user_joined", ...m }),
      user_left: (m) => p.current.onUserChange?.({ type: "user_left", ...m }),
      name_changed: (m) =>
        p.current.onUserChange?.({ type: "name_changed", ...m }),
      user_typing: (m) =>
        p.current.onUserChange?.({ type: "user_typing", ...m }),

      host_changed: (m) => {
        p.current.onUserChange?.({ type: "host_changed", ...m });
        p.current.onStateUpdate?.((prev) =>
          prev ? { ...prev, hostId: m.newHostId } : prev,
        );
        if (m.transferredFrom)
          p.current.onChatMessage?.({
            senderId: "system",
            ts: Date.now(),
            text: "[HOST] Host role transferred.",
          });
      },

      "REC:subtitle": (url) =>
        p.current.onStateUpdate?.((prev) =>
          prev ? { ...prev, subtitleUrl: url } : prev,
        ),

      chat: (m) => p.current.onChatMessage?.(m),
      chat_history: (m) =>
        p.current.onChatMessage?.({ type: "chat_history", ...m }),

      "REC:error": (m) => {
        if (m.code === "STRICT_VIDEO_MODE") {
          p.current.onChatMessage?.({
            senderId: "system",
            ts: Date.now(),
            text: `[STRICT] ${m.message}`,
          });
          return;
        }
        if (m.code === "WRONG_PASSWORD") {
          p.current.onChatMessage?.({
            senderId: "system",
            ts: Date.now(),
            text: "[LOCK] Wrong room password — access denied.",
          });
          if (socketRef.current) {
            socketRef.current.io.opts.reconnection = false;
            socketRef.current.disconnect();
          }
          p.current.onKicked?.("WRONG_PASSWORD");
          return;
        }
        if (m.message === "Invalid host token") {
          // [Note] Clears stale token, triggering a guest-mode reconnect
          if (socketRef.current) socketRef.current.disconnect();
          p.current.onKicked?.(m.message);
          return;
        }
        if (m.message === "You have been removed from the room.") {
          if (socketRef.current) {
            socketRef.current.io.opts.reconnection = false;
            socketRef.current.disconnect();
          }
          p.current.onKicked?.(m.message);
        }
      },
    };

    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));
  }, [loop, externalSocketRef]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (externalSocketRef) externalSocketRef.current = null;
      clearInterval(timer.current);
    };
  }, [connect, externalSocketRef]);

  // [Note] Skip initial render to avoid redundant double-connection on first initialization.
  const prevHostToken = useRef(hostToken);
  useEffect(() => {
    if (prevHostToken.current === hostToken) return;
    prevHostToken.current = hostToken;
    if (hostToken === "") connect();
  }, [hostToken, connect]);

  return null;
}

import { useEffect, useRef, useCallback } from "react";
import {
  computeCorrection,
  expectedTime,
  SYNC_CHECK_INTERVAL,
  SYNC_TOLERANCE_S,
} from "@/lib/syncManager";
import { CLOCK_RECAL_INTERVAL } from "@/constants/config";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://astra-ws.onrender.com"
    : `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:3001`);

const ioRef = { current: null };

export function useRoomSocket(props) {
  const p = useRef(props);
  p.current = props;

  const socketRef = useRef(null);
  const serverLine = useRef(null);
  const syncTimer = useRef(null);
  const tsMap = useRef({});
  const isBuffering = useRef(false);
  const lastSyncStatus = useRef("synced");
  const preventSyncUntil = useRef(0);
  const clockOffset = useRef(0);
  const initialSeekDone = useRef(false);
  const clockTimerRef = useRef(null);
  const localPlaybackRate = useRef(1);

  const updateServerLine = useCallback((updates) => {
    if (serverLine.current) {
      serverLine.current = { ...serverLine.current, ...updates };
    }
  }, []);

  const suppressNativeFeedback = useCallback(() => {
    const v = p.current.videoRef?.current;
    if (v) {
      v._suppressNative = true;
      setTimeout(() => {
        if (v) v._suppressNative = false;
      }, 150);
    }
  }, []);

  const checkBuffering = useCallback((v) => {
    if (isBuffering.current) return true;
    return v && v.isBuffering === true;
  }, []);

  const lockSync = useCallback((ms = 1000) => {
    preventSyncUntil.current = Date.now() + ms;
  }, []);

  const send = useCallback(
    (type, data) => {
      const socket = socketRef.current;
      if (!socket || !socket.connected) return;

      let event = type;
      if (type === "speed") {
        event = "CMD:playbackRate";
        if (data?.rate != null) localPlaybackRate.current = data.rate;
      }

      if (event.startsWith("CMD:")) {
        socket.emit(event, p.current.roomId, data);
      } else {
        socket.emit(event, data);
      }

      // Lock synchronization after significant state changes to allow for network propagation
      if (
        ["CMD:play", "CMD:pause", "CMD:host", "CMD:playbackRate"].includes(
          event,
        )
      ) {
        lockSync(1000);
      } else if (event === "CMD:seek") {
        lockSync(3000);
      }
    },
    [lockSync],
  );

  const startSyncLoop = useCallback(() => {
    clearInterval(syncTimer.current);
    syncTimer.current = setInterval(() => {
      const { videoRef, onDriftStatus, canControl, speedSyncEnabled, userId } =
        p.current;
      const v = videoRef?.current;
      const s = serverLine.current;

      if (!v || !s) return;

      const resultsInWindow = Date.now() < preventSyncUntil.current;
      const hasControl = canControl !== false;

      // 1. Play/Pause state enforcement
      if (!resultsInWindow && hasControl) {
        if (s.isPlaying && v.paused && !checkBuffering(v)) {
          suppressNativeFeedback();
          v.play().catch(() => {});
        } else if (!s.isPlaying && !v.paused) {
          suppressNativeFeedback();
          v.pause();
        }
      }

      // 2. Playback Rate Correction (Speed Sync)
      const targetRate = s.playbackRate || 1;
      if (v.readyState < 3 || checkBuffering(v) || resultsInWindow) {
        if (Math.abs(v.playbackRate - targetRate) > 0.005) {
          v.playbackRate = targetRate;
        }
        return;
      }

      const lt = tsMap.current._leaderTime_ ?? 0;
      const leaderTime = lt > 0 ? lt : expectedTime(s, clockOffset.current);
      if (leaderTime === 0) return;

      const drift = leaderTime - v.currentTime;
      const syncStatus =
        Math.abs(drift) <= SYNC_TOLERANCE_S ? "synced" : "soft";

      if (syncStatus !== lastSyncStatus.current) {
        lastSyncStatus.current = syncStatus;
        onDriftStatus?.(syncStatus);
      }

      // Initial alignment
      if (!initialSeekDone.current && Math.abs(drift) > 1.5) {
        v.currentTime = leaderTime;
        initialSeekDone.current = true;
      }

      // Apply dynamic speed correction for drift
      const speedSyncActive = speedSyncEnabled !== false;
      const baseRate =
        speedSyncActive || s?.hostId === userId
          ? localPlaybackRate.current || s.playbackRate || 1
          : 1;

      const correction = computeCorrection(
        v.currentTime,
        leaderTime,
        s.isPlaying,
      );
      const outputRate =
        correction.action === "soft"
          ? baseRate * correction.playbackRate
          : baseRate;

      if (Math.abs(v.playbackRate - outputRate) > 0.005) {
        v.playbackRate = outputRate;
      }
    }, SYNC_CHECK_INTERVAL);
  }, [checkBuffering, suppressNativeFeedback]);

  const connect = useCallback(async () => {
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

    if (!ioRef.current) {
      const { default: io } = await import("socket.io-client");
      ioRef.current = io;
    }

    const socket = ioRef.current(WS_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

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
      startSyncLoop();

      // Time Synchronization Protocol (Clock Calibration)
      const calibrate = () => {
        const t0 = Date.now();
        socket.emit("PING_CLOCK", t0, (serverTime) => {
          if (typeof serverTime !== "number") return;
          const rtt = Date.now() - t0;
          clockOffset.current = serverTime + rtt / 2 - Date.now();
        });
      };
      calibrate();
      if (clockTimerRef.current) clearInterval(clockTimerRef.current);
      clockTimerRef.current = setInterval(calibrate, CLOCK_RECAL_INTERVAL);
    });

    const handlers = {
      disconnect: () => onConnStatus?.("reconnecting"),
      connect_error: () => onConnStatus?.("reconnecting"),

      "REC:host": (m) => {
        const state = {
          videoUrl: m.video,
          isPlaying: !m.paused,
          currentTime: m.videoTS,
          playbackRate: m.playbackRate ?? 1,
          strictVideoUrlMode: !!m.strictVideoUrlMode,
          hostOnlyControls: !!m.hostOnlyControls,
          hasPassword: !!m.hasPassword,
          subtitleUrl: m.subtitleUrl || "",
          hostId: m.hostId || "",
        };

        const isInit = !serverLine.current;
        const prev = serverLine.current;
        const videoChanged = prev && prev.videoUrl !== m.video;

        serverLine.current = state;
        if (m.playbackRate != null) localPlaybackRate.current = m.playbackRate;

        p.current.onStateUpdate?.(state);

        if (isInit || videoChanged) initialSeekDone.current = false;
        if (Date.now() < preventSyncUntil.current) return;

        const v = p.current.videoRef?.current;
        if (isInit && v && state.currentTime > 0) {
          v.currentTime = state.currentTime;
          initialSeekDone.current = true;
          if (state.isPlaying) {
            suppressNativeFeedback();
            v.play().catch(() => {});
          }
          if (m.reconnected) p.current.onReconnected?.();
          else if (state.currentTime > 120)
            p.current.onLateJoin?.(state.currentTime);
        }

        // System messages on state changes
        if (!isInit && prev) {
          const sys = (text) =>
            p.current.onChatMessage?.({
              senderId: "system",
              ts: Date.now(),
              text,
            });
          if (prev.strictVideoUrlMode !== m.strictVideoUrlMode)
            sys(
              m.strictVideoUrlMode ? "[STRICT] Mode ON" : "[STRICT] Mode OFF",
            );
          if (prev.hostOnlyControls !== m.hostOnlyControls)
            sys(
              m.hostOnlyControls
                ? "[LOCK] Host-only controls ON"
                : "[UNLOCK] Everyone can control",
            );
        }
      },

      "REC:play": (m) => {
        const v = p.current.videoRef?.current;
        if (v) {
          if (m?.videoTS != null && Math.abs(v.currentTime - m.videoTS) > 0.5)
            v.currentTime = m.videoTS;
          suppressNativeFeedback();
          v.play().catch(() => {});
        }
      },

      "REC:pause": () => {
        const v = p.current.videoRef?.current;
        if (v && !v.paused) {
          suppressNativeFeedback();
          v.pause();
        }
      },

      "REC:seek": (time) => {
        const v = p.current.videoRef?.current;
        if (v && Math.abs(v.currentTime - time) > 0.5) v.currentTime = time;
        if (Date.now() < preventSyncUntil.current) return;
        const fmt = (t) =>
          `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
        p.current.onChatMessage?.({
          senderId: "system",
          ts: Date.now(),
          text: `[SEEK] Host jumped to ${fmt(time)}`,
        });
      },

      "REC:tsMap": (data) => {
        tsMap.current = data;
        p.current.onTsMapUpdate?.(data);
      },

      "REC:error": (m) => {
        const critical = [
          "STRICT_VIDEO_MODE",
          "WRONG_PASSWORD",
          "NEED_PASSWORD",
          "UNAUTHORIZED",
          "ROOM_NOT_FOUND",
          "TERMINATED",
        ].includes(m.code);
        if (critical || m.message === "Invalid host token") {
          if (socketRef.current) socketRef.current.disconnect();
          // [Note] Pass code not message so handleKicked can switch on it reliably
          p.current.onKicked?.(m.code || m.message);
        } else if (m.message) {
          p.current.addToast?.(m.message, "error");
        }
      },

      // Chat and Participants
      chat: (m) => p.current.onChatMessage?.(m),
      chat_history: (m) =>
        p.current.onChatMessage?.({ type: "chat_history", ...m }),
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
        p.current.onStateUpdate?.((p) =>
          p ? { ...p, hostId: m.newHostId } : p,
        );
      },

      // WebRTC Call Signaling
      "CALL:offer": (m) => p.current.onCallEvent?.({ type: "offer", ...m }),
      "CALL:answer": (m) => p.current.onCallEvent?.({ type: "answer", ...m }),
      "CALL:ice": (m) => p.current.onCallEvent?.({ type: "ice", ...m }),
    };

    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));
  }, [startSyncLoop, suppressNativeFeedback]);

  // Initial connection and lifecycle
  useEffect(() => {
    connect();
    return () => {
      const s = socketRef.current;
      if (s) {
        s.removeAllListeners();
        s.disconnect();
      }
      clearInterval(syncTimer.current);
      clearInterval(clockTimerRef.current);
    };
  }, [connect]);

  // Periodic heartbeat reporting local status to the server
  useEffect(() => {
    const int = setInterval(() => {
      const v = p.current.videoRef?.current;
      const s = socketRef.current;
      if (v && !v.paused && !checkBuffering(v) && s?.connected) {
        s.emit("CMD:ts", p.current.roomId, {
          currentTime: v.currentTime,
          clientId: p.current.userId,
          ts: Date.now(),
        });
      }
    }, 1000);
    return () => clearInterval(int);
  }, [checkBuffering]);

  return { send, socketRef, updateServerLine };
}

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
  const p = useRef();
  p.current = props;

  const socketRef = useRef(null);
  const serverLine = useRef(null);
  const timer = useRef(null);
  const tsMap = useRef({});
  const isBuffering = useRef(false);
  const lastStatus = useRef("synced");
  const preventUpdateEnd = useRef(0);
  const clockOffset = useRef(0);
  const initialSeekDone = useRef(false);
  const suppressNativeRef = useRef(false);
  const socketHandlersRef = useRef({});
  const clockTimerRef = useRef(null);
  const localPlaybackRate = useRef(1);

  const updateServerLine = useCallback((updates) => {
    if (serverLine.current) {
      serverLine.current = { ...serverLine.current, ...updates };
    }
  }, []);

  const suppressNext = useCallback(() => {
    suppressNativeRef.current = true;
    const v = p.current.videoRef?.current;
    if (v) v._suppressNative = true;
    setTimeout(() => {
      suppressNativeRef.current = false;
      const vv = p.current.videoRef?.current;
      if (vv) vv._suppressNative = false;
    }, 150);
  }, []);

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
      if (!socket) return;

      let socketEvent = type;
      if (type === "speed") {
        socketEvent = "CMD:playbackRate";
        if (data?.rate != null) localPlaybackRate.current = data.rate;
      }

      if (socketEvent.startsWith("CMD:")) {
        socket.emit(socketEvent, p.current.roomId, data);
      } else {
        socket.emit(socketEvent, data);
      }

      if (
        ["CMD:play", "CMD:pause", "CMD:host", "CMD:playbackRate"].includes(socketEvent)
      )
        preventSync(1000);
      if (socketEvent === "CMD:seek") preventSync(3000);
    },
    [preventSync],
  );

  const loop = useCallback(() => {
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      const { videoRef: vr, onDriftStatus: od } = p.current;
      const v = vr?.current;
      const s = serverLine.current;
      if (!v || !s) return;

      const inPreventWindow = Date.now() < preventUpdateEnd.current;
      const canControl = p.current.canControl !== false;

      if (!inPreventWindow && canControl) {
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
        if (Math.abs(v.playbackRate - targetRate) > 0.005) {
          v.playbackRate = targetRate;
        }
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

      const correction = computeCorrection(
        v.currentTime,
        leaderTime,
        s.isPlaying,
      );
      const speedSyncOn = p.current.speedSyncEnabled !== false;
      const commandedRate =
        speedSyncOn || s?.hostId === p.current.userId
          ? localPlaybackRate.current !== 1
            ? localPlaybackRate.current
            : s.playbackRate || 1
          : 1;

      // [Fix] Apply drift correction RELATIVE to commanded rate, not relative to 1x.
      // correction.playbackRate is a ratio near 1 (e.g., 0.94-1.06).
      // If commandedRate=2 and correction=0.94, result should be 2*0.94=1.88, not 0.94.
      const correctedRate =
        correction.action === "soft" ? commandedRate * correction.playbackRate : commandedRate;

      if (Math.abs(v.playbackRate - correctedRate) > 0.005) {
        v.playbackRate = correctedRate;
      }
    }, SYNC_CHECK_INTERVAL);
  }, [isBufferingNow, suppressNext]);

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
      try {
        const { default: io } = await import("socket.io-client");
        ioRef.current = io;
      } catch (err) {
        return;
      }
    }

    const socket = ioRef.current(WS_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
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
      loop();

      const calibrateClock = () => {
        const t0 = Date.now();
        socket.emit("PING_CLOCK", t0, (serverTime) => {
          if (typeof serverTime !== "number") return;
          const rtt = Date.now() - t0;
          clockOffset.current = serverTime + rtt / 2 - Date.now();
        });
      };
      calibrateClock();
      if (clockTimerRef.current) clearInterval(clockTimerRef.current);
      clockTimerRef.current = setInterval(calibrateClock, CLOCK_RECAL_INTERVAL);
      socket.once("disconnect", () => {
        if (clockTimerRef.current) {
          clearInterval(clockTimerRef.current);
          clockTimerRef.current = null;
        }
      });
    });

    const handlers = {
      disconnect: (reason) => {
        p.current.onConnStatus?.("reconnecting");
      },
      connect_error: (err) => {
        p.current.onConnStatus?.("reconnecting");
      },
      "REC:host": (m) => {
        const state = {
          videoUrl: m.video,
          isPlaying: !m.paused,
          currentTime: m.videoTS,
          playbackRate: m.playbackRate ?? 1,
          strictVideoUrlMode: m.strictVideoUrlMode ?? false,
          hostOnlyControls: m.hostOnlyControls ?? false,
          hasPassword: m.hasPassword ?? false,
          subtitleUrl: m.subtitleUrl || "",
          hostId: m.hostId || "",
        };
        const wasInitial = !serverLine.current;
        const prev = serverLine.current;
        const videoChanged = prev && prev.videoUrl !== m.video;
        serverLine.current = state;
        if (m.playbackRate != null) {
          localPlaybackRate.current = m.playbackRate;
        }
        p.current.onStateUpdate?.(state);
        if (wasInitial || videoChanged) initialSeekDone.current = false;
        if (Date.now() < preventUpdateEnd.current) return;
        const v = p.current.videoRef?.current;
        if (wasInitial && v && state.currentTime > 0) {
          v.currentTime = state.currentTime;
          initialSeekDone.current = true;
          if (state.isPlaying) {
            suppressNext();
            v.play().catch(() => {});
          }
          if (m.reconnected) {
            p.current.onReconnected?.();
            if (typeof document !== "undefined" && document.pictureInPictureElement) {
              document.exitPictureInPicture().catch(() => {});
            }
          }
          else if (state.currentTime > 120)
            p.current.onLateJoin?.(state.currentTime);
        }

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
      "REC:subtitle": (url) => {
        if (url == null) return;
        
        let decodedUrl = String(url);
        if (decodedUrl.includes("%")) {
          try {
            decodedUrl = decodeURIComponent(decodedUrl);
          } catch (e) {
            // use raw string on decode failure
          }
        }
        
        if (decodedUrl && decodedUrl.length > 0) {
          p.current.onStateUpdate?.((prev) => {
            const newState = prev ? { ...prev, subtitleUrl: decodedUrl } : { subtitleUrl: decodedUrl };
            return newState;
          });
        }
      },
      chat: (m) => p.current.onChatMessage?.(m),
      chat_history: (m) =>
        p.current.onChatMessage?.({ type: "chat_history", ...m }),
      chat_update: (m) => p.current.onChatUpdate?.(m),
      "CALL:user_joined": (m) => p.current.onCallEvent?.({ type: "call_user_joined", ...m }),
      "CALL:user_left": (m) => p.current.onCallEvent?.({ type: "call_user_left", ...m }),
      "CALL:offer": (m) => p.current.onCallEvent?.({ type: "offer", ...m }),
      "CALL:answer": (m) => p.current.onCallEvent?.({ type: "answer", ...m }),
      "CALL:ice": (m) => p.current.onCallEvent?.({ type: "ice", ...m }),
      "CALL:status": (m) => p.current.onCallEvent?.({ type: "status", ...m }),
      "REC:error": (m) => {
        if (m.code === "STRICT_VIDEO_MODE") {
          p.current.onChatMessage?.({
            senderId: "system",
            ts: Date.now(),
            text: `[STRICT] ${m.message}`,
          });
          return;
        }
        if (
          m.code === "WRONG_PASSWORD" ||
          m.code === "NEED_PASSWORD" ||
          m.message === "You have been removed from the room."
        ) {
          if (socketRef.current) {
            socketRef.current.io.opts.reconnection = false;
            socketRef.current.disconnect();
          }
          p.current.onKicked?.(m.code || m.message);
          return;
        }
        if (m.message === "Invalid host token") {
          if (socketRef.current) socketRef.current.disconnect();
          p.current.onKicked?.(m.message);
        }
      },
    };

    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));
    socketHandlersRef.current = handlers;
  }, [loop, suppressNext]);

  useEffect(() => {
    connect();
    return () => {
      const socket = socketRef.current;
      if (socket && socketHandlersRef.current) {
        Object.keys(socketHandlersRef.current).forEach((ev) =>
          socket.off(ev),
        );
        socketHandlersRef.current = {};
      }
      if (clockTimerRef.current) {
        clearInterval(clockTimerRef.current);
        clockTimerRef.current = null;
      }
      if (socket) socket.disconnect();
      clearInterval(timer.current);
    };
  }, [connect, props.userId, props.roomId]);

  useEffect(() => {
    const int = setInterval(() => {
      const v = p.current.videoRef?.current;
      const socket = socketRef.current;
      if (v && !v.paused && !isBufferingNow(v) && socket?.connected) {
        socket.emit("CMD:ts", p.current.roomId, {
          currentTime: v.currentTime,
          clientId: p.current.userId,
          ts: Date.now(),
        });
      }
    }, 1000);
    return () => clearInterval(int);
  }, [isBufferingNow]);

  return { send, socketRef, updateServerLine };
}

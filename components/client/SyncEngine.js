// components/client/SyncEngine.js - Refactored for Socket.IO and ref.md logic
"use client";

import { useEffect, useRef, useCallback } from "react";
import io from "socket.io-client";
import {
  selectLeader,
  computeCorrection,
  driftStatus,
  SYNC_INTERVAL,
  EXTREME_DRIFT_THRESHOLD,
} from "@/lib/sync";

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
  onDriftStatus,
  onConnStatus,
  onKicked,
  sendRef,
}) {
  const p = useRef(); // Props ref to avoid dependency loops
  p.current = {
    roomId,
    userId,
    hostToken,
    videoUrl,
    displayName,
    videoRef,
    onStateUpdate,
    onChatMessage,
    onUserChange,
    onDriftStatus,
    onConnStatus,
    onKicked,
  };

  const socketRef = useRef(null);
  const serverLine = useRef(null);
  const timer = useRef(null);
  const backoffRef = useRef(1000);
  const tsMap = useRef({});
  const isBuffering = useRef(false);
  const preventUpdateEnd = useRef(0);
  const lastPbrRef = useRef(1.0);

  const preventSync = useCallback((ms = 1000) => {
    preventUpdateEnd.current = Date.now() + ms;
  }, []);

  const send = useCallback(
    (type, data) => {
      const socket = socketRef.current;
      if (socket?.connected) {
          socket.emit(type, data);
      }

      // Conflict resolution for local actions
      if (["CMD:play", "CMD:pause", "CMD:host", "CMD:speed"].includes(type)) {
          preventSync(1000);
      }
      if (type === "CMD:seek") {
          preventSync(3000); 
      }
    },
    [preventSync],
  );

  useEffect(() => {
    if (sendRef) sendRef.current = (msg) => {
        if (msg.type === "chat") send("chat", { text: msg.text });
        else if (msg.type === "play") send("CMD:play", { videoTS: msg.currentTime });
        else if (msg.type === "pause") send("CMD:pause", { videoTS: msg.currentTime });
        else if (msg.type === "seek") send("CMD:seek", msg.currentTime);
        else if (msg.type === "speed") send("CMD:speed", { rate: msg.rate, videoTS: msg.currentTime });
        else if (msg.type === "change_video") send("CMD:host", { video: msg.videoUrl, subtitleUrl: msg.subtitleUrl, paused: true });
        else if (msg.type === "kick") send("CMD:kick", { targetUserId: msg.targetUserId });
        else if (msg.type === "toggle_host_controls") send("CMD:lock");
        else if (msg.type === "set_subtitle") send("CMD:subtitle", msg.url);
        else send(msg.type, msg);
    };
  }, [send, sendRef]);

  // Periodic Reporting (ref.md: Client-Side Timestamp Emission)
  useEffect(() => {
    const int = setInterval(() => {
      const v = videoRef?.current;
      const socket = socketRef.current;
      if (v && !v.paused && !isBuffering.current && socket?.connected) {
        // ref.md uses CMD:ts
        socket.emit("CMD:ts", v.currentTime);
      }
    }, 1000); // EXACTLY 1 second
    return () => clearInterval(int);
  }, [videoRef]);

  // Buffering Detection
  useEffect(() => {
    const v = videoRef?.current;
    if (!v) return;

    const handleWaiting = () => { isBuffering.current = true; };
    const handleCanPlay = () => { isBuffering.current = false; };
    const handlePlaying = () => { isBuffering.current = false; };

    v.addEventListener("waiting", handleWaiting);
    v.addEventListener("canplay", handleCanPlay);
    v.addEventListener("playing", handlePlaying);

    return () => {
      v.removeEventListener("waiting", handleWaiting);
      v.removeEventListener("canplay", handleCanPlay);
      v.removeEventListener("playing", handlePlaying);
    };
  }, [videoRef]);

  // Drift Correction Loop (ref.md: Drift Detection & Correction)
  const loop = useCallback(() => {
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      const { videoRef: vr, onDriftStatus: od, userId: myId } = p.current;
      const v = vr?.current;
      const s = serverLine.current;
      
      if (!v || !s) return;
      
      // 1. Enforce Play/Pause (Always, regardless of state, to trigger loads)
      if (s.isPlaying && v.paused && !isBuffering.current) {
          v.play().catch(() => {});
      } else if (!s.isPlaying && !v.paused) {
          v.pause();
      }

      // 2. State Guard for Time Correction
      if (v.readyState < 3 || isBuffering.current || Date.now() < preventUpdateEnd.current) {
          if (v.playbackRate !== 1.0) v.playbackRate = 1.0;
          return;
      }

      // Watchparty Sync Logic
      const times = Object.values(tsMap.current).filter(t => typeof t === "number");
      if (times.length === 0) return;

      const myTime = v.currentTime;
      let leaderTime;

      // 1. Leader Selection
      if (times.length > 2) {
          const sorted = [...times].sort((a,b) => a-b);
          leaderTime = sorted[Math.floor(sorted.length / 2)];
      } else {
          leaderTime = Math.max(...times);
      }

      // 2. Drift Calculation (target is leaderTime)
      const delta = leaderTime - myTime;
      let pbr = 1.0;

      // Update Sync Status for UI
      od?.(Math.abs(delta) <= 0.5 ? "synced" : "soft");

      // 3. Smooth Correction
      if (delta > 0.5) {
          pbr += Number((delta / 10).toFixed(2));
          pbr = Math.min(pbr, 1.1);
      } else if (delta < -1.0) {
          // If we are significantly ahead, slow down slightly
          pbr = 0.95;
      }

      // Apply PBR (with jitter guard)
      if (Math.abs(v.playbackRate - pbr) > 0.01) {
          v.playbackRate = pbr;
      }

      // 4. Hard Seek (Emergency Only)
      if (Math.abs(delta) > 10) {
          preventSync(1000);
          v.currentTime = leaderTime;
      }

      // Enforce play/pause
      if (s.isPlaying && v.paused) v.play().catch(() => {});
      else if (!s.isPlaying && !v.paused) v.pause();

    }, SYNC_INTERVAL);
  }, []);

  const connect = useCallback(() => {
    const { roomId, userId, hostToken, videoUrl, displayName, onConnStatus, onUserChange, onStateUpdate, onChatMessage, onKicked } = p.current;
    
    if (socketRef.current) socketRef.current.disconnect();

    const socket = io(WS_URL, {
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
      });
      console.log(`[sync] Joined room ${roomId}. Initial Video: ${videoUrl || 'none'}`);
      loop();
    });

    // Core Handlers
    const handlers = {
        "disconnect": () => {
            onConnStatus?.("reconnecting");
        },
        "REC:host": (m) => {
            const state = {
                ...m,
                videoUrl: m.video,
                isPlaying: !m.paused,
                currentTime: m.videoTS,
            };
            
            // Record state even if sync is prevented (so we have latest info when window ends)
            const wasInitial = !serverLine.current;
            serverLine.current = state;
            onStateUpdate?.(state);

            // But only apply immediate jump if NOT in a preventSync window
            if (Date.now() < preventUpdateEnd.current) return;

            // Initial Jump on Join
            const v = p.current.videoRef?.current;
            if (wasInitial && v && state.currentTime > 0) {
                v.currentTime = state.currentTime;
                if (state.isPlaying) v.play().catch(() => {});
            }
        },
        "REC:play": (m) => {
            const v = p.current.videoRef?.current;
            if (v) {
                if (m && typeof m.videoTS === "number") {
                    const delta = Math.abs(v.currentTime - m.videoTS);
                    if (delta > 0.5) v.currentTime = m.videoTS;
                }
                v.play().catch(() => {});
            }
        },
        "REC:pause": () => {
            const v = p.current.videoRef?.current;
            if (v && !v.paused) v.pause();
        },
        "REC:seek": (time) => {
            const v = p.current.videoRef?.current;
            if (v && Math.abs(v.currentTime - time) > 0.5) {
                v.currentTime = time;
            }
        },
        "REC:tsMap": (data) => {
            tsMap.current = data;
        },
        "roster": (users) => onUserChange?.({ type: "participants", users }),
        "host_changed": (m) => {
            onUserChange?.({ type: "host_changed", ...m });
            onStateUpdate?.(prev => prev ? { ...prev, hostId: m.newHostId } : prev);
        },
        "REC:subtitle": (url) => {
            onStateUpdate?.(prev => prev ? { ...prev, subtitleUrl: url } : prev);
        },
        "chat": (m) => onChatMessage?.(m),
        "chat_history": (m) => onChatMessage?.(m),
        "error": (m) => {
            if (m.message === "Invalid host token") onKicked?.();
        }
    };

    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));

  }, [loop]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      clearInterval(timer.current);
    };
  }, [connect]);

  return null;
}

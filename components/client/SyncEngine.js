"use client";

import { useEffect, useRef, useCallback } from "react";
import io from "socket.io-client";
import {
  getLeaderTime,
  computeCorrection,
  expectedTime,
  SYNC_CHECK_INTERVAL,
  SYNC_TOLERANCE_S,
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
  participants,
  onDriftStatus,
  onConnStatus,
  onKicked,
  sendRef,
}) {
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
  };

  const socketRef = useRef(null);
  const serverLine = useRef(null);
  const timer = useRef(null);
  const tsMap = useRef({});
  const isBuffering = useRef(false);
  const lastStatus = useRef("synced");
  const preventUpdateEnd = useRef(0);
  const clockOffset = useRef(0);

  const preventSync = useCallback((ms = 1000) => {
    preventUpdateEnd.current = Date.now() + ms;
  }, []);

  const send = useCallback(
    (type, data) => {
      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit(type, data);
      }
      if (["CMD:play", "CMD:pause", "CMD:host", "CMD:playbackRate"].includes(type)) {
        preventSync(1000);
      }
      if (type === "CMD:seek") {
        preventSync(3000);
      }
    },
    [preventSync],
  );

  useEffect(() => {
    if (sendRef)
      sendRef.current = (msg) => {
        if (msg.type === "chat") send("chat", { text: msg.text });
        else if (msg.type === "play") send("CMD:play", { videoTS: msg.currentTime });
        else if (msg.type === "pause") send("CMD:pause", { videoTS: msg.currentTime });
        else if (msg.type === "seek") send("CMD:seek", msg.currentTime);
        else if (msg.type === "speed") send("CMD:playbackRate", { rate: msg.rate, videoTS: msg.currentTime });
        else if (msg.type === "change_video") send("CMD:host", { video: msg.videoUrl, subtitleUrl: msg.subtitleUrl, paused: true });
        else if (msg.type === "kick") send("CMD:kick", { targetUserId: msg.targetUserId });
        else if (msg.type === "toggle_host_controls") send("CMD:lock");
        else if (msg.type === "set_subtitle") send("CMD:subtitle", msg.url);
        else if (msg.type === "set_name") send("CMD:setName", { username: msg.username });
        else send(msg.type, msg);
      };
  }, [send, sendRef]);

  useEffect(() => {
    const int = setInterval(() => {
      const v = videoRef?.current;
      const socket = socketRef.current;
      if (v && !v.paused && !isBuffering.current && socket?.connected) {
        socket.emit("CMD:ts", p.current.roomId, { 
            currentTime: v.currentTime, 
            clientId: p.current.userId 
        });
      }
    }, 1000);
    return () => clearInterval(int);
  }, [videoRef]);

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

  const loop = useCallback(() => {
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      const { videoRef: vr, onDriftStatus: od, userId: myId } = p.current;
      const v = vr?.current;
      const s = serverLine.current;
      if (!v || !s) return;
      if (s.isPlaying && v.paused && !isBuffering.current) {
        v.play().catch(() => {});
      } else if (!s.isPlaying && !v.paused) {
        v.pause();
      }
      if (v.readyState < 3 || isBuffering.current || Date.now() < preventUpdateEnd.current) {
        if (v.playbackRate !== 1.0) v.playbackRate = 1.0;
        return;
      }
      const lt = getLeaderTime(tsMap.current, p.current.participants.length);
      const target = expectedTime(s, clockOffset.current);
      const leaderTime = lt || target;
      if (leaderTime === 0) return;
      const myTime = v.currentTime;
      const drift = leaderTime - myTime;
      const newStatus = Math.abs(drift) <= SYNC_TOLERANCE_S ? "synced" : "soft";
      if (newStatus !== lastStatus.current) {
        lastStatus.current = newStatus;
        od?.(newStatus);
      }
      const correction = computeCorrection(myTime, leaderTime, s.isPlaying);
      const pbr = correction.playbackRate;
      if (Math.abs(v.playbackRate - pbr) > 0.01) {
        v.playbackRate = pbr;
      }
      if (correction.action === "hard") {
        preventSync(1000);
        v.currentTime = leaderTime;
      }
      if (s.isPlaying && v.paused) v.play().catch(() => {});
      else if (!s.isPlaying && !v.paused) v.pause();
    }, SYNC_CHECK_INTERVAL);
  }, []);

  const connect = useCallback(() => {
    const {
      roomId,
      userId,
      hostToken,
      videoUrl,
      displayName,
      onConnStatus,
      onUserChange,
      onStateUpdate,
      onChatMessage,
      onKicked,
    } = p.current;
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
      loop();
    });
    const handlers = {
      disconnect: () => {
        onConnStatus?.("reconnecting");
      },
      "REC:host": (m) => {
        const state = {
          ...m,
          videoUrl: m.video,
          isPlaying: !m.paused,
          currentTime: m.videoTS,
        };
        const wasInitial = !serverLine.current;
        serverLine.current = state;
        onStateUpdate?.(state);
        if (Date.now() < preventUpdateEnd.current) return;
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
      "REC:roster": (users) => onUserChange?.({ type: "participants", users }),
      host_changed: (m) => {
        onUserChange?.({ type: "host_changed", ...m });
        onStateUpdate?.((prev) =>
          prev ? { ...prev, hostId: m.newHostId } : prev,
        );
      },
      "REC:subtitle": (url) => {
        onStateUpdate?.((prev) =>
          prev ? { ...prev, subtitleUrl: url } : prev,
        );
      },
      chat: (m) => onChatMessage?.(m),
      chat_history: (m) => onChatMessage?.(m),
      "REC:error": (m) => {
        if (m.message === "Invalid host token") onKicked?.();
      },
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

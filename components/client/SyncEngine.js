"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  expectedTime,
  computeCorrection,
  driftStatus,
  SYNC_CHECK_INTERVAL,
} from "@/lib/sync";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
const backoff = (attempt) => Math.min(1000 * 2 ** attempt, 30_000);

const SEEK_COOLDOWN_MS = 1500;

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
  const p = useRef({});
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

  const wsRef = useRef(null);
  const serverLine = useRef(null);
  const timer = useRef(null);
  const attempt = useRef(0);
  const rTimer = useRef(null);
  const clockOffset = useRef(0);
  const pTimer = useRef(null);
  const off = useRef(false);

  const lastSeekAt = useRef(0);

  const send = useCallback((payload) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  }, []);
  useEffect(() => {
    if (sendRef) sendRef.current = send;
  }, [send, sendRef]);

  const ping = useCallback(() => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping", clientTs: Date.now() }));
    }
  }, []);

  const loop = useCallback(() => {
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      const { videoRef: vr, onDriftStatus: od } = p.current;
      const v = vr?.current;
      const s = serverLine.current;
      if (!v || !s) return;
      if (v.readyState < 1) return;

      if (Date.now() - lastSeekAt.current < SEEK_COOLDOWN_MS) {
        od?.("synced");
        return;
      }

      const target = expectedTime(s, clockOffset.current);
      const drift = Math.abs(target - v.currentTime);
      od?.(driftStatus(drift));
      const c = computeCorrection(v.currentTime, target, s.isPlaying);

      if (c.action === "hard") {
        try {
          v.currentTime = c.seekTo;
          lastSeekAt.current = Date.now();
        } catch {}
        if (v.readyState >= 3) v.playbackRate = s.playbackRate || 1;
      } else if (c.action === "soft") {
        if (v.readyState >= 3) v.playbackRate = c.playbackRate;
      } else {
        if (
          s.playbackRate &&
          v.playbackRate !== s.playbackRate &&
          v.readyState >= 3
        )
          v.playbackRate = s.playbackRate;
      }
    }, SYNC_CHECK_INTERVAL);
  }, []);

  const sync = useCallback((s) => {
    p.current.onStateUpdate?.(s);
    serverLine.current = s;
    const v = p.current.videoRef?.current;
    if (!v) return;

    if (v.readyState >= 1) {
      const target = expectedTime(s, clockOffset.current);
      if (Math.abs(target - v.currentTime) > 0.5) {
        try {
          v.currentTime = target;
          lastSeekAt.current = Date.now();
        } catch {}
      }
    }
    if (s.isPlaying && v.paused) v.play().catch(() => {});
    else if (!s.isPlaying && !v.paused) v.pause();
  }, []);

  const connect = useCallback(() => {
    if (off.current) return;
    const { roomId, userId, hostToken, videoUrl, displayName, onConnStatus } =
      p.current;
    onConnStatus?.(attempt.current === 0 ? "connecting" : "reconnecting");

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      attempt.current = 0;
      p.current.onConnStatus?.("connected");
      p.current.onUserChange?.({ type: "reset" });
      ws.send(
        JSON.stringify({
          type: "join",
          roomId,
          userId,
          username: displayName,
          token: hostToken || undefined,
          videoUrl,
        }),
      );
      loop();
      ping();
      clearInterval(pTimer.current);
      pTimer.current = setInterval(ping, 10_000);
    };

    ws.onmessage = (e) => {
      let m;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      const pr = p.current;
      switch (m.type) {
        case "state_update":
          sync(m.state);
          break;
        case "participants":
          pr.onUserChange?.(m);
          break;
        case "user_joined":
          pr.onUserChange?.(m);
          break;
        case "user_left":
          pr.onUserChange?.(m);
          break;
        case "name_changed":
          pr.onUserChange?.(m);
          break;
        case "host_changed":
          pr.onStateUpdate?.((prev) =>
            prev ? { ...prev, hostId: m.newHostId } : prev,
          );
          break;
        case "pong":
          if (m.serverTime) {
            const rtt = Date.now() - (m.clientTs || Date.now());
            const serverNow = m.serverTime + rtt / 2;
            clockOffset.current = serverNow - Date.now();
            console.log(`[sync] Clock offset: ${clockOffset.current.toFixed(0)} ms (RTT: ${rtt} ms)`);
          }
          break;
        case "chat":
          pr.onChatMessage?.(m);
          break;
        case "kicked":
          pr.onKicked?.();
          break;
      }
    };

    ws.onclose = () => {
      if (off.current) return;
      clearInterval(timer.current);
      p.current.onConnStatus?.("reconnecting");
      p.current.onDriftStatus?.("hard");
      rTimer.current = setTimeout(connect, backoff(attempt.current++));
    };

    ws.onerror = () => ws.close();
  }, [loop, sync, ping]);

  useEffect(() => {
    off.current = false;
    connect();

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const ws = wsRef.current;
      if (!ws || ws.readyState === WebSocket.CLOSED) connect();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      off.current = true;
      clearInterval(timer.current);
      clearInterval(pTimer.current);
      clearTimeout(rTimer.current);
      document.removeEventListener("visibilitychange", onVisible);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect, ping, loop, sync]);

  return null;
}

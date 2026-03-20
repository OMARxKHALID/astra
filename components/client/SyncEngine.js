"use client";

import { useEffect, useRef, useCallback } from "react";
import io from "socket.io-client";
import {
  getLeaderTime,
  computeCorrection,
  expectedTime,
  SYNC_CHECK_INTERVAL,
  SYNC_TOLERANCE_S,
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
  // p holds the latest props without needing to re-create callbacks on every render
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
  const serverLine = useRef(null); // last REC:host state from the server
  const timer = useRef(null); // sync loop interval
  const tsMap = useRef({}); // latest REC:tsMap from server
  const isBuffering = useRef(false); // true while the native <video> element is stalled
  const lastStatus = useRef("synced");
  const lastSystemTx = useRef(0);
  const preventUpdateEnd = useRef(0); // timestamp until which sync corrections are suppressed
  const clockOffset = useRef(0); // ms offset between local and server clocks
  const initialSeekDone = useRef(false);

  /**
   * Single source of truth for "is this player currently buffering?".
   *
   * Two mechanisms exist depending on player type:
   *  - Native <video>: DOM events (waiting/canplay/playing) set isBuffering.current
   *  - YouTube/Vimeo proxies: expose a `isBuffering` getter on the proxy object
   *    (set from onStateChange/bufferstart events inside the player components)
   *
   * Both must be checked together. Using only one breaks the other player type.
   */
  const isBufferingNow = useCallback((v) => {
    if (isBuffering.current) return true;
    if (v && typeof v.isBuffering !== "undefined")
      return Boolean(v.isBuffering);
    return false;
  }, []);

  const preventSync = useCallback((ms = 1000) => {
    preventUpdateEnd.current = Date.now() + ms;
  }, []);

  // Unified outbound message dispatcher.
  // Translates RoomClient action objects into specific socket events.
  const send = useCallback(
    (type, data) => {
      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit(type, data);
      }
      // Suppress sync corrections briefly after user-initiated control events
      // to avoid immediately undoing the action we just sent.
      if (
        ["CMD:play", "CMD:pause", "CMD:host", "CMD:playbackRate"].includes(type)
      ) {
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
        else if (msg.type === "play")
          send("CMD:play", { videoTS: msg.currentTime });
        else if (msg.type === "pause")
          send("CMD:pause", { videoTS: msg.currentTime });
        else if (msg.type === "seek") send("CMD:seek", msg.currentTime);
        else if (msg.type === "speed")
          send("CMD:playbackRate", {
            rate: msg.rate,
            videoTS: msg.currentTime,
          });
        else if (msg.type === "change_video")
          send("CMD:host", {
            video: msg.videoUrl,
            subtitleUrl: msg.subtitleUrl,
            paused: true,
          });
        else if (msg.type === "kick")
          send("CMD:kick", { targetUserId: msg.targetUserId });
        else if (msg.type === "toggle_host_controls") send("CMD:lock");
        else if (msg.type === "toggle_strict_video_url_mode")
          send("CMD:strictVideoUrlMode");
        else if (msg.type === "set_subtitle") send("CMD:subtitle", msg.url);
        else if (msg.type === "set_name")
          send("CMD:setName", { username: msg.username });
        else send(msg.type, msg);
      };
  }, [send, sendRef]);

  // Emit CMD:ts every second while playing — keeps the server's tsMap fresh
  // so all clients have accurate leader time data for drift correction.
  // Skip while buffering so frozen/stale timestamps don't pollute the tsMap
  // and cause all clients to drift toward a frozen position.
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

  // Track buffering state so the sync loop can pause corrections while stalled.
  // For the native player, videoRef.current is a real HTMLVideoElement that
  // supports addEventListener. For YouTube / Vimeo, videoRef.current is a
  // custom JS proxy — addEventListener does not exist on it. Those players
  // instead expose an `isBuffering` getter on the proxy that the sync loop
  // reads directly (see YouTubePlayer.js / VimeoPlayer.js).
  useEffect(() => {
    const v = videoRef?.current;
    if (!v || typeof v.addEventListener !== "function") return;
    const handleWaiting = () => {
      isBuffering.current = true;
    };
    const handleCanPlay = () => {
      isBuffering.current = false;
    };
    const handlePlaying = () => {
      isBuffering.current = false;
    };
    v.addEventListener("waiting", handleWaiting);
    v.addEventListener("canplay", handleCanPlay);
    v.addEventListener("playing", handlePlaying);
    return () => {
      v.removeEventListener("waiting", handleWaiting);
      v.removeEventListener("canplay", handleCanPlay);
      v.removeEventListener("playing", handlePlaying);
    };
  }, [videoRef]);

  // Core sync loop — runs every SYNC_CHECK_INTERVAL (500ms).
  // Compares local playback position against the leader time and adjusts
  // playback rate to converge. Never hard-seeks automatically; that is
  // strictly user-triggered to avoid jarring jumps.
  const loop = useCallback(() => {
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      const { videoRef: vr, onDriftStatus: od } = p.current;
      const v = vr?.current;
      const s = serverLine.current;
      if (!v || !s) return;

      // Keep play/pause state in sync with server authority.
      // Don't call .play() while buffering — the player will resume on its own
      // once it has enough data; forcing .play() mid-stall is a no-op on native
      // and wastes an IPC call on embed players.
      if (s.isPlaying && v.paused && !isBufferingNow(v)) {
        v.play().catch(() => {});
      } else if (!s.isPlaying && !v.paused) {
        v.pause();
      }

      // Skip rate corrections while buffering, not ready, or just after
      // a user-initiated event (preventSync window).
      // isBufferingNow() covers both native DOM events (isBuffering.current)
      // and embedded player proxy getters (v.isBuffering) in one check.
      if (
        v.readyState < 3 ||
        isBufferingNow(v) ||
        Date.now() < preventUpdateEnd.current
      ) {
        if (v.playbackRate !== 1.0) v.playbackRate = 1.0;
        return;
      }

      // Prefer the tsMap-based leader time (median of all clients).
      // Fall back to extrapolating from server's last known state if the
      // tsMap is empty (e.g. on first join before any timestamps arrive).
      const lt = getLeaderTime(tsMap.current);
      const target = expectedTime(s, clockOffset.current);
      const leaderTime = lt > 0 ? lt : target;
      if (leaderTime === 0) return;

      const myTime = v.currentTime;
      const drift = leaderTime - myTime;

      // Report sync status for the UI indicator
      const newStatus = Math.abs(drift) <= SYNC_TOLERANCE_S ? "synced" : "soft";
      if (newStatus !== lastStatus.current) {
        lastStatus.current = newStatus;
        od?.(newStatus);
      }

      // Apply soft correction (playback rate only — no automatic hard-seeks)
      // EXCEPT for the very first join if the initial seek failed
      if (!initialSeekDone.current && Math.abs(drift) > 1) {
        v.currentTime = leaderTime;
        initialSeekDone.current = true;
      }

      const correction = computeCorrection(myTime, leaderTime, s.isPlaying);
      if (Math.abs(v.playbackRate - correction.playbackRate) > 0.005) {
        v.playbackRate = correction.playbackRate;
      }

      // Final play/pause enforcement after corrections
      if (s.isPlaying && v.paused) v.play().catch(() => {});
      else if (!s.isPlaying && !v.paused) v.pause();
    }, SYNC_CHECK_INTERVAL);
  }, [isBufferingNow]);

  const connect = useCallback(() => {
    if (socketRef.current) socketRef.current.disconnect();

    const socket = io(WS_URL, {
      transports: ["websocket", "polling"],
      // Never give up on reconnection. The old limit of 5 attempts meant a
      // brief network hiccup would permanently disconnect a user from the room
      // with no visible error. Socket.IO's exponential backoff (1s → 30s)
      // keeps retrying until the connection is restored.
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    socketRef.current = socket;

    // "connect" fires on both initial connection AND successful reconnects.
    // Re-emitting JOIN_ROOM on reconnect is correct — it re-registers the
    // client with the server and triggers a full REC:host state re-sync.
    socket.on("connect", () => {
      p.current.onConnStatus?.("connected");
      socket.emit("JOIN_ROOM", {
        roomId: p.current.roomId,
        clientId: p.current.userId,
        username: p.current.displayName,
        token: p.current.hostToken || undefined,
        videoUrl: p.current.videoUrl || "",
      });
      loop();
    });

    const handlers = {
      disconnect: () => {
        onConnStatus?.("reconnecting");
      },

      connect_error: () => {
        onConnStatus?.("reconnecting");
      },

      // Full room state broadcast from server (on join + after control events)
      "REC:host": (m) => {
        const prevState = serverLine.current;
        const state = {
          ...m,
          videoUrl: m.video,
          isPlaying: !m.paused,
          currentTime: m.videoTS,
        };
        const wasInitial = !prevState;
        serverLine.current = state;
        p.current.onStateUpdate?.(state);

        // Event-driven toasts: compare previous and current state to detect mode changes.
        if (prevState && Date.now() - lastSystemTx.current > 500) {
          if (prevState.strictVideoUrlMode !== state.strictVideoUrlMode) {
            lastSystemTx.current = Date.now();
            p.current.onChatMessage?.({
              senderId: "system",
              text: state.strictVideoUrlMode
                ? "[SHIELD] Strict URL mode ON — direct files only."
                : "[SHIELD] Strict URL mode OFF — all URLs allowed.",
              ts: Date.now(),
            });
          } else if (prevState.hostOnlyControls !== state.hostOnlyControls) {
            lastSystemTx.current = Date.now();
            p.current.onChatMessage?.({
              senderId: "system",
              text: state.hostOnlyControls
                ? "[LOCK] Room Locked — Host controls only."
                : "[UNLOCK] Room Unlocked — Everyone can control.",
              ts: Date.now(),
            });
          }
        }

        if (wasInitial) initialSeekDone.current = false;

        if (Date.now() < preventUpdateEnd.current) return;
        const v = p.current.videoRef?.current;
        if (wasInitial && v && state.currentTime > 0) {
          v.currentTime = state.currentTime;
          initialSeekDone.current = true;
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

      // tsMap: { userId → currentTimeSeconds } — used by the sync loop
      // to compute the median leader time and correct drift.
      "REC:tsMap": (data) => {
        tsMap.current = data;
      },

      // Full roster update (emitted on join and on disconnect)
      "REC:roster": (users) =>
        p.current.onUserChange?.({ type: "participants", users }),

      // A new user joined — notify existing members so they can show a toast
      // and update the participant list immediately without waiting for the
      // next full roster broadcast.
      user_joined: (m) => {
        p.current.onUserChange?.({ type: "user_joined", ...m });
      },

      // A specific user left — update their row in the UI
      user_left: (m) => {
        p.current.onUserChange?.({ type: "user_left", ...m });
      },

      // A user changed their display name
      name_changed: (m) => {
        p.current.onUserChange?.({ type: "name_changed", ...m });
      },

      host_changed: (m) => {
        p.current.onUserChange?.({ type: "host_changed", ...m });
        p.current.onStateUpdate?.((prev) =>
          prev ? { ...prev, hostId: m.newHostId } : prev,
        );
      },

      "REC:subtitle": (url) => {
        p.current.onStateUpdate?.((prev) =>
          prev ? { ...prev, subtitleUrl: url } : prev,
        );
      },

      chat: (m) => p.current.onChatMessage?.(m),
      chat_history: (m) => p.current.onChatMessage?.({ type: "chat_history", ...m }),

      "REC:error": (m) => {
        // Strict video URL mode rejection — surface as a toast, don't kick.
        if (m.code === "STRICT_VIDEO_MODE") {
          p.current.onChatMessage?.({
            senderId: "system",
            text: `[STRICT] ${m.message}`,
            ts: Date.now(),
          });
          return;
        }
        if (
          m.message === "Invalid host token" ||
          m.message === "You have been removed from the room."
        ) {
          if (socketRef.current) {
            socketRef.current.io.opts.reconnection = false;
            socketRef.current.disconnect();
          }
          p.current.onKicked?.();
        }
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

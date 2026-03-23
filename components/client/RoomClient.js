"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import SyncEngine from "./SyncEngine";
import VideoPlayer from "./video-player";
import VideoUrlInput from "./VideoUrlInput";
import ChatPanel from "./ChatPanel";
import ParticipantList from "./ParticipantList";
import SyncStatusIndicator from "./SyncStatusIndicator";
import ReconnectBanner from "./ReconnectBanner";
import ToastContainer, { useToast } from "./Toast";
import SettingsPanel from "./SettingsPanel";
import TmdbPanel from "./TmdbPanel";
import TmdbSearch from "./TmdbSearch";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
import PasswordModal from "./PasswordModal";
import {
  Share2 as ShareIcon,
  Crown as CrownIcon,
  Film as FilmIcon,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  Captions as CcIcon,
  Pencil as PencilIcon,
  PanelRight as SidebarIcon,
  MessageSquare as ChatIcon,
  Users as UsersIcon,
  Shield as ShieldIcon,
  SkipForward as SeekIcon,
  Settings2 as SettingsGearIcon,
  Keyboard as KeyboardIcon,
  Link2,
  X as XIcon,
} from "lucide-react";
import { getLeaderTime } from "@/lib/sync";
import {
  LS_KEYS,
  MAX_CHAT_MESSAGES,
  MAX_HISTORY_ENTRIES,
  REDIS_TTL_S,
} from "@/lib/constants";

// Safe localStorage helpers — no-op on server or when storage is blocked
const ls = {
  get: (k) => {
    try {
      return typeof window !== "undefined" ? localStorage.getItem(k) : null;
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      if (typeof window !== "undefined") localStorage.setItem(k, v);
    } catch {}
  },
  remove: (k) => {
    try {
      if (typeof window !== "undefined") localStorage.removeItem(k);
    } catch {}
  },
};

export default function RoomClient({ roomId, initialMeta }) {
  const router = useRouter();
  const { toasts, addToast } = useToast();

  // Guard: nothing that reads localStorage should render before this is true
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Identity ──────────────────────────────────────────────────────────────
  const [userId, setUserId] = useState("");
  useEffect(() => {
    const key = LS_KEYS.userId;
    const stored = ls.get(key) || sessionStorage.getItem(key);
    if (stored) {
      ls.set(key, stored);
      setUserId(stored);
      return;
    }
    const id = crypto.randomUUID();
    ls.set(key, id);
    setUserId(id);
  }, []);

  const [displayName, setDisplayName] = useState("");
  const [nameReady, setNameReady] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const sendRef = useRef(null);

  useEffect(() => {
    const stored = ls.get(LS_KEYS.displayName);
    const name =
      stored || `Guest-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    if (!stored) ls.set(LS_KEYS.displayName, name);
    setDisplayName(name);
    setNameReady(true);
  }, []);

  const commitName = useCallback((raw) => {
    const name = raw.trim().slice(0, 24);
    if (!name) return;
    setDisplayName(name);
    ls.set(LS_KEYS.displayName, name);
    sendRef.current?.({ type: "set_name", username: name });
    setEditingName(false);
  }, []);

  // ── Password gate ─────────────────────────────────────────────────────────
  const [roomPassword, setRoomPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);

  useEffect(() => {
    const stored = ls.get(`pw_${roomId}`);
    if (stored) {
      setRoomPassword(stored);
      setNeedsPassword(false);
      setSyncEnabled(true);
    } else if (initialMeta?.hasPassword) {
      setNeedsPassword(true);
      setSyncEnabled(false);
    } else {
      setNeedsPassword(false);
      setSyncEnabled(true);
    }
  }, [roomId, initialMeta?.hasPassword]);

  const handlePasswordSubmit = useCallback(
    (pw) => {
      ls.set(`pw_${roomId}`, pw);
      setRoomPassword(pw);
      setPasswordError("");
      setNeedsPassword(false);
      setSyncEnabled(true);
    },
    [roomId],
  );

  const handleWrongPassword = useCallback(() => {
    ls.remove(`pw_${roomId}`);
    setRoomPassword("");
    setPasswordError("Incorrect password — try again.");
    setNeedsPassword(true);
    setSyncEnabled(false);
  }, [roomId]);

  // ── Core room state ───────────────────────────────────────────────────────
  const [serverState, setServerState] = useState(null);
  const [syncStatus, setSyncStatus] = useState("synced");
  const [connStatus, setConnStatus] = useState("connecting");
  const [participants, setParticipants] = useState([]);
  const [displayNames, setDisplayNames] = useState({});
  const [messages, setMessages] = useState([]);
  const [mobileSheet, setMobileSheet] = useState(null);
  const [tsMapState, setTsMapState] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [tmdbMeta, setTmdbMeta] = useState(null);
  const typingTimers = useRef({});
  const displayNamesRef = useRef(displayNames);
  displayNamesRef.current = displayNames;

  // ── Settings — SSR-safe defaults, then corrected from localStorage after mount
  const [screenshotEnabled, setScreenshotEnabled] = useState(true);
  const [hlsQualityEnabled, setHlsQualityEnabled] = useState(true);
  const [scrubPreviewEnabled, setScrubPreviewEnabled] = useState(true);
  const [speedSyncEnabled, setSpeedSyncEnabled] = useState(true);
  const [ambilightEnabled, setAmbilightEnabled] = useState(true);
  const [urlBarPosition, setUrlBarPosition] = useState("bottom");
  const [showSettings, setShowSettings] = useState(false);
  const [showTmdbPanel, setShowTmdbPanel] = useState(false);
  const [showTmdbSearch, setShowTmdbSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [theatreMode, setTheatreMode] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(0);
  // Guard that prevents the save effect from firing before the load effect has applied
  // localStorage values. Both effects are scheduled from the same first render; without
  // this flag the save effect runs with default state and overwrites stored values.
  const settingsLoadedRef = useRef(false);

  // Load settings from localStorage on mount — runs BEFORE the save effect (declared first)
  useEffect(() => {
    setScreenshotEnabled(ls.get(LS_KEYS.screenshot) !== "false");
    setHlsQualityEnabled(ls.get(LS_KEYS.hlsQuality) !== "false");
    setScrubPreviewEnabled(ls.get(LS_KEYS.scrubPreview) !== "false");
    setAmbilightEnabled(ls.get(LS_KEYS.ambilight) !== "false");
    setSpeedSyncEnabled(ls.get(LS_KEYS.speedSync) !== "false");
    setUrlBarPosition(ls.get(LS_KEYS.urlBarPos) || "bottom");
    setTheatreMode(ls.get(LS_KEYS.theatreMode) === "true");
    setShowSidebar(ls.get(LS_KEYS.sidebarOpen) !== "false");
    const savedWidth = ls.get(LS_KEYS.sidebarWidth);
    if (savedWidth) setSidebarWidth(parseInt(savedWidth, 10));
    // Mark load complete so the save effect below is now allowed to write
    settingsLoadedRef.current = true;
  }, []);

  // Persist settings changes to localStorage — skipped on the first render pass
  // (before settingsLoadedRef is true) to prevent default values overwriting stored ones
  useEffect(() => {
    if (!settingsLoadedRef.current) return;
    ls.set(LS_KEYS.screenshot, screenshotEnabled ? "true" : "false");
    ls.set(LS_KEYS.hlsQuality, hlsQualityEnabled ? "true" : "false");
    ls.set(LS_KEYS.scrubPreview, scrubPreviewEnabled ? "true" : "false");
    ls.set(LS_KEYS.ambilight, ambilightEnabled ? "true" : "false");
    ls.set(LS_KEYS.speedSync, speedSyncEnabled ? "true" : "false");
    ls.set(LS_KEYS.urlBarPos, urlBarPosition);
    ls.set(LS_KEYS.theatreMode, theatreMode ? "true" : "false");
    ls.set(LS_KEYS.sidebarOpen, showSidebar ? "true" : "false");
    ls.set(LS_KEYS.sidebarWidth, sidebarWidth.toString());
  }, [
    screenshotEnabled,
    hlsQualityEnabled,
    scrubPreviewEnabled,
    ambilightEnabled,
    speedSyncEnabled,
    urlBarPosition,
    theatreMode,
    showSidebar,
    sidebarWidth,
  ]);

  // ── Sidebar drag-to-resize ────────────────────────────────────────────────
  const onDragStart = useCallback(
    (e) => {
      isDragging.current = true;
      dragStartX.current = e.clientX;
      dragStartW.current = sidebarWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [sidebarWidth],
  );

  useEffect(() => {
    const up = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    const move = (e) => {
      if (!isDragging.current) return;
      // Drag left = wider sidebar; clamp between 250 and 600
      setSidebarWidth(
        Math.max(
          250,
          Math.min(dragStartW.current + (dragStartX.current - e.clientX), 600),
        ),
      );
    };
    window.addEventListener("mouseup", up);
    window.addEventListener("mousemove", move);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("mousemove", move);
    };
  }, []);

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const [playerChatOpen, setPlayerChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fsElement, setFsElement] = useState(null);

  useEffect(() => {
    const onFS = () => {
      const el = document.fullscreenElement;
      setIsFullscreen(!!el);
      setFsElement(el || null);
      if (!el) setPlayerChatOpen(false);
    };
    document.addEventListener("fullscreenchange", onFS);
    return () => document.removeEventListener("fullscreenchange", onFS);
  }, []);

  // Global keyboard shortcuts (T = theatre, ? = shortcuts help)
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tag)) return;
      if (e.target.isContentEditable) return;
      if (e.key === "?") setShowShortcuts((v) => !v);
      if (e.key === "t" || e.key === "T") setTheatreMode((v) => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Late-join catch-up ────────────────────────────────────────────────────
  const [lateJoinTime, setLateJoinTime] = useState(null);
  const handleLateJoin = useCallback((ts) => setLateJoinTime(ts), []);
  const handleCatchUp = useCallback(() => {
    setLateJoinTime(null);
    const v = videoRef.current;
    if (!v) return;
    // Seek to the median of all current participant positions
    const times = Object.values(tsMapState)
      .filter((t) => typeof t === "number")
      .sort((a, b) => a - b);
    if (times.length) v.currentTime = times[Math.floor(times.length / 2)];
  }, [tsMapState]);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const videoRef = useRef(null);
  const bentoVideoRef = useRef(null);
  const rootAmbiRef = useRef(null);
  // socketRef: holds the Socket.IO instance exposed by SyncEngine so TMDB can broadcast
  const socketRef = useRef(null);

  // Ambilight — direct DOM writes bypass React to avoid re-renders at ~12fps
  const ambilightEnabledRef = useRef(ambilightEnabled);
  useEffect(() => {
    ambilightEnabledRef.current = ambilightEnabled;
    if (!ambilightEnabled) {
      if (rootAmbiRef.current) rootAmbiRef.current.style.opacity = "0";
      if (bentoVideoRef.current) bentoVideoRef.current.style.boxShadow = "";
    }
  }, [ambilightEnabled]);

  const handleAmbiColors = useCallback((colors) => {
    const overlay = rootAmbiRef.current;
    if (overlay) {
      if (colors && ambilightEnabledRef.current) {
        overlay.style.opacity = "1";
        overlay.style.background = `radial-gradient(ellipse 100% 100% at 50% 0%, rgba(${colors.r},${colors.g},${colors.b},0.4) 0%, transparent 100%)`;
      } else {
        overlay.style.opacity = "0";
      }
    }
    const section = bentoVideoRef.current;
    if (section) {
      section.style.boxShadow =
        colors && ambilightEnabledRef.current
          ? `0 0 100px 30px rgba(${colors.r},${colors.g},${colors.b},0.35), inset 0 1px 0 rgba(255,255,255,0.055)`
          : "";
    }
  }, []);

  // ── Socket event handlers ─────────────────────────────────────────────────
  const handleStateUpdate = useCallback((stOrFn) => setServerState(stOrFn), []);
  const handleTsMapUpdate = useCallback(
    (data) => setTsMapState({ ...data }),
    [],
  );

  const handleChatMessage = useCallback(
    (msg) => {
      if (msg.type === "chat_history") {
        setMessages(msg.messages || []);
        return;
      }
      if (!msg.text && !msg.dataUrl && msg.senderId !== "system") return;

      if (msg.senderId === "system") {
        const MAP = {
          "[HOST]": { color: "text-amber-500", Icon: CrownIcon, type: "info" },
          "[VIDEO]": { color: "text-jade", Icon: FilmIcon, type: "success" },
          "[SUBS]": { color: "text-jade", Icon: CcIcon, type: "success" },
          "[LOCK]": { color: "text-amber-400", Icon: LockIcon, type: "info" },
          "[UNLOCK]": { color: "text-jade", Icon: UnlockIcon, type: "success" },
          "[STRICT_ON]": {
            color: "text-jade",
            Icon: ShieldIcon,
            type: "success",
          },
          "[STRICT_OFF]": {
            color: "text-white/40",
            Icon: ShieldIcon,
            type: "info",
          },
          "[STRICT]": { color: "text-danger", Icon: ShieldIcon, type: "error" },
          "[SEEK]": { color: "text-amber-400", Icon: SeekIcon, type: "info" },
        };
        let text = msg.text || "",
          type = "info",
          icon = null;
        for (const [tag, { color, Icon, type: t }] of Object.entries(MAP)) {
          if (text.includes(tag)) {
            text = text.replace(tag, "").trim();
            type = t;
            icon = <Icon className={`w-4 h-4 ${color}`} />;
            break;
          }
        }
        addToast(text, type, 4000, icon);
        return;
      }

      setMessages((prev) => [...prev, msg].slice(-MAX_CHAT_MESSAGES));
      const isMobile =
        typeof window !== "undefined" && window.innerWidth < 1024;
      const isVisible = document.fullscreenElement
        ? playerChatOpen
        : isMobile
          ? mobileSheet === "chat"
          : showSidebar;
      if (!isVisible) setUnreadCount((n) => n + 1);
    },
    [mobileSheet, showSidebar, playerChatOpen, addToast],
  );

  const handleUserChange = useCallback(
    (event) => {
      if (!event) return;
      switch (event.type) {
        case "reset":
          setParticipants([]);
          setDisplayNames({});
          break;
        case "participants":
          setParticipants((event.users || []).map((u) => u.userId));
          setDisplayNames((prev) => {
            const n = { ...prev };
            (event.users || []).forEach((u) => {
              n[u.userId] = u.username;
            });
            return n;
          });
          break;
        case "user_joined":
          setParticipants((prev) =>
            prev.includes(event.userId) ? prev : [...prev, event.userId],
          );
          if (event.username) {
            setDisplayNames((prev) => ({
              ...prev,
              [event.userId]: event.username,
            }));
            if (event.userId !== userId)
              addToast(`${event.username} joined!`, "info");
          }
          break;
        case "user_left": {
          const name = displayNamesRef.current[event.userId] || "Someone";
          setParticipants((prev) => prev.filter((id) => id !== event.userId));
          addToast(`${name} left.`, "info");
          break;
        }
        case "name_changed":
          setDisplayNames((prev) => ({
            ...prev,
            [event.userId]: event.username,
          }));
          break;
        case "user_typing":
          setTypingUsers((prev) => ({
            ...prev,
            [event.userId]: { username: event.username, ts: Date.now() },
          }));
          clearTimeout(typingTimers.current[event.userId]);
          typingTimers.current[event.userId] = setTimeout(() => {
            setTypingUsers((prev) => {
              const n = { ...prev };
              delete n[event.userId];
              return n;
            });
          }, 3500);
          break;
      }
    },
    [userId, addToast],
  );

  const handleKicked = useCallback(
    (reason) => {
      if (reason === "WRONG_PASSWORD") {
        handleWrongPassword();
        return;
      }
      router.push("/?kicked=1");
    },
    [router, handleWrongPassword],
  );

  // ── Playback command handlers ─────────────────────────────────────────────
  const handleSendChat = useCallback(
    (text, dataUrl) => sendRef.current?.({ type: "chat", text, dataUrl }),
    [],
  );
  const handleLoadUrl = useCallback(
    (url, sub) =>
      sendRef.current?.({
        type: "change_video",
        videoUrl: url,
        subtitleUrl: sub,
      }),
    [],
  );
  const handleSubtitleChange = useCallback(
    (sub) => sendRef.current?.({ type: "set_subtitle", url: sub }),
    [],
  );
  const handleTyping = useCallback(
    () => sendRef.current?.({ type: "typing" }),
    [],
  );

  const handlePlay = useCallback((t) => {
    setServerState((s) => ({ ...(s || {}), isPlaying: true, currentTime: t }));
    sendRef.current?.({ type: "play", currentTime: t });
  }, []);
  const handlePause = useCallback((t) => {
    setServerState((s) => ({ ...(s || {}), isPlaying: false, currentTime: t }));
    sendRef.current?.({ type: "pause", currentTime: t });
  }, []);
  const handleSeek = useCallback((t) => {
    setServerState((s) => ({ ...(s || {}), currentTime: t }));
    sendRef.current?.({ type: "seek", currentTime: t });
  }, []);
  const handleSpeed = useCallback((rate) => {
    const t = videoRef.current?.currentTime || 0;
    setServerState((s) => ({
      ...(s || {}),
      playbackRate: rate,
      currentTime: t,
      lastUpdated: Date.now(),
    }));
    sendRef.current?.({ type: "speed", rate, currentTime: t });
  }, []);

  const handleKick = useCallback(
    (tid) => sendRef.current?.({ type: "kick", targetUserId: tid }),
    [],
  );
  const handleTransferHost = useCallback(
    (tid) => sendRef.current?.({ type: "transfer_host", targetUserId: tid }),
    [],
  );
  const handleToggleHostControls = useCallback(
    () => sendRef.current?.({ type: "toggle_host_controls" }),
    [],
  );
  const handleToggleStrictMode = useCallback(
    () => sendRef.current?.({ type: "toggle_strict_video_url_mode" }),
    [],
  );
  const handleSetPassword = useCallback(
    (pw) => sendRef.current?.({ type: "set_password", password: pw }),
    [],
  );
  const handleReconnected = useCallback(
    () => addToast("Reconnected — synced to room.", "success", 2500),
    [addToast],
  );

  const handleShare = useCallback(() => {
    addToast("Room link copied!", "success");
    navigator.clipboard
      ?.writeText(`${window.location.origin}/room/${roomId}`)
      .catch(() => {});
  }, [addToast, roomId]);

  // Stable prop for VideoPlayer — new function reference on every render would break React.memo
  const handleToggleTheatre = useCallback(() => setTheatreMode((v) => !v), []);
  // Stable prop for VideoPlayer — same reason as handleToggleTheatre
  const handleSendScreenshot = useCallback(
    (dataUrl) => handleSendChat("📸 Screenshot", dataUrl),
    [handleSendChat],
  );

  // hostToken — read after mount to avoid SSR mismatch
  const [hostToken, setHostToken] = useState("");
  const [hostTokenReady, setHostTokenReady] = useState(false);
  useEffect(() => {
    setHostToken(ls.get(`host_${roomId}`) || "");
    setHostTokenReady(true);
  }, [roomId]);

  // ── Derived values ────────────────────────────────────────────────────────
  // Optimistic isHost: trust local hostToken before serverState arrives to avoid gear-icon flash
  const isHost =
    serverState?.hostId === userId || (!!hostToken && !serverState);
  const hostId = serverState?.hostId ?? null;
  const isPlaying = serverState?.isPlaying ?? false;
  const playbackRate = serverState?.playbackRate ?? 1;
  const videoUrl =
    serverState?.videoUrl !== undefined
      ? serverState.videoUrl
      : initialMeta?.videoUrl || "";
  const subtitleUrl =
    serverState?.subtitleUrl ?? initialMeta?.subtitleUrl ?? "";
  const hostOnlyControls = serverState?.hostOnlyControls ?? false;
  const strictVideoUrlMode = serverState?.strictVideoUrlMode ?? false;
  const hasPassword =
    serverState?.hasPassword ?? initialMeta?.hasPassword ?? false;
  const createdAt = serverState?.createdAt ?? initialMeta?.createdAt ?? null;
  const canControl = !hostOnlyControls || isHost;
  const leaderTime = tsMapState._leaderTime_ || 0;
  const isTheatre = theatreMode && !isFullscreen;

  // handleCopyVideoUrl must live AFTER videoUrl is declared to avoid TDZ ReferenceError
  const handleCopyVideoUrl = useCallback(() => {
    if (!videoUrl) {
      addToast("No video loaded yet.", "info");
      return;
    }
    navigator.clipboard
      ?.writeText(videoUrl)
      .then(() => addToast("Video URL copied!", "success"))
      .catch(() => addToast("Copy failed — try manually.", "error"));
  }, [addToast, videoUrl]);

  // ── TMDB meta broadcast via socketRef ─────────────────────────────────────
  // Host emits CMD:tmdbMeta so all participants receive the same metadata without re-fetching
  const updateTmdbMeta = useCallback(
    (meta) => {
      setTmdbMeta(meta);
      if (isHost && socketRef.current?.connected) {
        socketRef.current.emit("CMD:tmdbMeta", meta);
      }
    },
    [isHost],
  );

  // Sync tmdbMeta pushed from serverState (e.g. on late join or host change)
  useEffect(() => {
    if (serverState?.tmdbMeta === undefined) return;
    setTmdbMeta((prev) =>
      JSON.stringify(serverState.tmdbMeta) !== JSON.stringify(prev)
        ? serverState.tmdbMeta
        : prev,
    );
  }, [serverState?.tmdbMeta]); // eslint-disable-line

  // Auto-detect movie title from video filename — only for MP4/HLS, never for streaming platforms
  useEffect(() => {
    if (!videoUrl) {
      setTmdbMeta(null);
      return;
    }
    if (tmdbMeta) return; // don't overwrite a manual or server-synced selection
    if (
      videoUrl.includes("youtube.com") ||
      videoUrl.includes("youtu.be") ||
      videoUrl.includes("vimeo.com")
    ) {
      setTmdbMeta(null);
      return;
    }
    try {
      const u = new URL(videoUrl);
      const filename = u.pathname.split("/").pop();
      const rawTitle = filename.replace(/\.(mp4|mkv|avi|webm|m3u8)$/i, "");
      const cleanTitle = rawTitle
        .replace(/[._-]/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2") // split CamelCase
        .replace(/(19|20)\d{2}.*/, "") // strip year and everything after
        .trim();

      // Skip filenames that look like hashes or random tokens
      const isHashLike =
        /^[A-Z0-9]{4,}$/.test(cleanTitle) ||
        /^[a-f0-9]{6,}$/i.test(cleanTitle) ||
        !/[aeiou]/i.test(cleanTitle) ||
        /^[a-zA-Z0-9]{6,}$/.test(cleanTitle.replace(/\s/g, ""));

      if (cleanTitle.length > 2 && !isHashLike) {
        fetch(`/api/tmdb?q=${encodeURIComponent(cleanTitle)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            // API returns { items: [...] } — take first hit if available
            const hit = d?.items?.[0] ?? null;
            setTmdbMeta(hit);
            if (hit && isHost && socketRef.current?.connected) {
              socketRef.current.emit("CMD:tmdbMeta", hit);
            }
          })
          .catch(() => setTmdbMeta(null));
      } else {
        setTmdbMeta(null);
      }
    } catch {
      setTmdbMeta(null);
    }
  }, [videoUrl, isHost]); // intentionally omit tmdbMeta — checked at top of effect

  // ── Room expiry display ───────────────────────────────────────────────────
  // Rooms have a 24h Redis TTL. Show a countdown badge once < 2h remain.
  const roomExpiresIn = useMemo(() => {
    if (!createdAt) return null;
    const remaining = createdAt + REDIS_TTL_S * 1000 - Date.now();
    if (remaining <= 0) return "Expired";
    if (remaining > 2 * 3600 * 1000) return null;
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  }, [createdAt]);

  // Persist watch history — saved once per session when server state first arrives
  const historySavedRef = useRef(false);
  useEffect(() => {
    if (!serverState || historySavedRef.current || !videoUrl) return;
    historySavedRef.current = true;
    try {
      const history = JSON.parse(localStorage.getItem(LS_KEYS.history) || "[]");
      const ytMatch = videoUrl.match(
        /(?:youtube\.com\/watch\?.*v=|youtu\.be\/)([A-Za-z0-9_-]{11})/,
      );
      const entry = {
        roomId,
        videoUrl,
        thumbnail: ytMatch
          ? `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`
          : null,
        title: videoUrl.replace(/^https?:\/\//, "").slice(0, 60),
        videoTS: serverState.currentTime || 0,
        lastVisited: Date.now(),
        isHost,
      };
      localStorage.setItem(
        LS_KEYS.history,
        JSON.stringify(
          [entry, ...history.filter((h) => h.roomId !== roomId)].slice(
            0,
            MAX_HISTORY_ENTRIES,
          ),
        ),
      );
      const recent = JSON.parse(
        localStorage.getItem(LS_KEYS.recentRooms) || "[]",
      );
      localStorage.setItem(
        LS_KEYS.recentRooms,
        JSON.stringify(
          [
            { id: roomId, url: videoUrl, time: Date.now() },
            ...recent.filter((r) => r.id !== roomId),
          ].slice(0, 3),
        ),
      );
    } catch {}
  }, [serverState, videoUrl, roomId, isHost]);

  // Fullscreen chat portal — rendered directly into the fullscreen element to avoid
  // causing the YouTube / Vimeo iframe to repaint when chat state changes.
  // Uses position:fixed (not absolute) so the overlay anchors to the fullscreen viewport
  // and is completely outside the video container's block-flow layout.
  const fullscreenChatPortal =
    isFullscreen && fsElement
      ? createPortal(
          <div className="fixed top-3 right-3 z-[100] flex flex-col items-end pointer-events-none">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPlayerChatOpen((v) => {
                  if (!v) setUnreadCount(0);
                  return !v;
                });
              }}
              className="pointer-events-auto w-10 h-10 flex items-center justify-center rounded-[2rem] bg-black/50 backdrop-blur-md text-white/70 hover:text-white ring-1 ring-white/10 shadow-xl relative transition-colors"
            >
              <ChatIcon className="w-5 h-5" />
              {!playerChatOpen && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-void animate-pulse" />
              )}
            </button>
            {playerChatOpen && (
              <div
                className="pointer-events-auto mt-2 w-72 sm:w-80 h-[400px] rounded-[2rem] border border-white/10 bg-black/55 backdrop-blur-3xl overflow-hidden flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0 bg-white/5">
                  <span className="font-display font-bold text-sm text-white/90">
                    Room Chat
                  </span>
                  <button
                    onClick={() => setPlayerChatOpen(false)}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 min-h-0">
                  <ChatPanel
                    messages={messages}
                    userId={userId}
                    displayNames={displayNames}
                    onSend={handleSendChat}
                    typingUsers={typingUsers}
                    onTyping={handleTyping}
                  />
                </div>
              </div>
            )}
          </div>,
          fsElement,
        )
      : null;

  return (
    <div
      className={`h-dvh flex flex-col overflow-hidden font-body antialiased${theatreMode ? " theatre-mode" : ""}`}
    >
      {/* Ambilight fixed overlay — position:fixed escapes overflow:hidden, bleeds into navbar */}
      <div
        ref={rootAmbiRef}
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 5,
          pointerEvents: "none",
          opacity: 0,
          transition: "opacity 0.6s ease",
        }}
      />

      {/* Password modal — client-only to avoid SSR hydration mismatch */}
      {mounted && needsPassword && (
        <PasswordModal
          roomId={roomId}
          onSubmit={handlePasswordSubmit}
          error={passwordError}
        />
      )}

      {/* Ambient background radial gradient */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_15%_20%,rgba(245,158,11,0.07),transparent_50%),radial-gradient(ellipse_at_85%_80%,rgba(16,185,129,0.05),transparent_50%)]"
      />

      {/* SyncEngine — only mount after identity + password gate are resolved */}
      {userId && nameReady && syncEnabled && hostTokenReady && (
        <SyncEngine
          roomId={roomId}
          userId={userId}
          hostToken={hostToken}
          videoUrl={videoUrl}
          displayName={displayName}
          videoRef={videoRef}
          onStateUpdate={handleStateUpdate}
          onChatMessage={handleChatMessage}
          onUserChange={handleUserChange}
          participants={participants}
          onDriftStatus={setSyncStatus}
          onConnStatus={setConnStatus}
          onKicked={handleKicked}
          sendRef={sendRef}
          socketRef={socketRef}
          onTsMapUpdate={handleTsMapUpdate}
          onLateJoin={handleLateJoin}
          onReconnected={handleReconnected}
          roomPassword={roomPassword}
        />
      )}

      <ReconnectBanner connStatus={connStatus} />
      <ToastContainer toasts={toasts} />

      {lateJoinTime && !isFullscreen && (
        <CatchUpBanner
          videoTS={lateJoinTime}
          onSync={handleCatchUp}
          onDismiss={() => setLateJoinTime(null)}
        />
      )}

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="room-navbar relative z-10 shrink-0 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Left: logo + room ID + expiry + display name */}
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-3 py-2 rounded-[2rem] glass-card hover:border-white/15 transition-all active:scale-95 shrink-0"
          >
            <div className="w-7 h-7 rounded-[2rem] bg-amber-500 flex items-center justify-center font-display font-black text-void text-[10px]">
              WT
            </div>
            <span className="font-display font-bold text-base tracking-tight text-white/90 hidden md:block">
              WatchTogether
            </span>
          </button>

          <div className="flex items-center gap-2 px-2.5 py-2 rounded-[2rem] glass-card text-[10px] font-mono uppercase tracking-[0.2em] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-jade/70 animate-pulse" />
            {hasPassword && (
              <LockIcon
                className="w-3 h-3 text-amber-400/70"
                strokeWidth={2}
                title="Password protected"
              />
            )}
            <span className="text-white/70 font-black hidden xs:inline">
              {roomId}
            </span>
            <span className="text-white/70 font-black xs:hidden">
              {roomId.slice(0, 4)}
            </span>
            {roomExpiresIn && (
              <span className="hidden sm:inline text-danger/70 font-black text-[8px] border-l border-white/10 pl-2">
                {roomExpiresIn}
              </span>
            )}
          </div>

          {nameReady &&
            (editingName ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  commitName(nameInput);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-[2rem] glass-card min-w-0"
              >
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={() => commitName(nameInput || displayName)}
                  onKeyDown={(e) => e.key === "Escape" && setEditingName(false)}
                  maxLength={24}
                  className="w-28 bg-transparent text-xs font-mono text-white/80 outline-none"
                  placeholder="Your name…"
                />
              </form>
            ) : (
              <button
                onClick={() => {
                  setNameInput(displayName);
                  setEditingName(true);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-[2rem] glass-card hover:border-white/15 transition-all text-[10px] font-mono text-white/50 hover:text-white/80 max-w-[140px] min-w-0"
              >
                <PencilIcon className="w-3 h-3 shrink-0" />
                <span className="truncate">{displayName}</span>
              </button>
            ))}
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              setShowSidebar((v) => !v);
              if (!showSidebar) setUnreadCount(0);
            }}
            title={showSidebar ? "Hide sidebar" : "Show sidebar"}
            className="hidden lg:flex w-9 h-9 items-center justify-center rounded-[2rem] glass-card text-muted hover:text-white/80 transition-all active:scale-95 relative"
          >
            <SidebarIcon className="w-4 h-4" />
            {!showSidebar && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-void flex items-center justify-center text-[8px] font-bold text-void">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <div className="px-3 py-2 rounded-[2rem] glass-card">
            <SyncStatusIndicator
              syncStatus={syncStatus}
              connStatus={connStatus}
            />
          </div>

          <button
            onClick={() => setShowShortcuts(true)}
            title="Keyboard shortcuts (?)"
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-[2rem] glass-card text-muted hover:text-white/80 transition-all active:scale-95"
          >
            <KeyboardIcon className="w-4 h-4" />
          </button>

          {isHost && (
            <button
              onClick={() => setShowSettings(true)}
              title="Room settings"
              className="w-9 h-9 flex items-center justify-center rounded-[2rem] glass-card text-muted hover:text-white/80 transition-all active:scale-95"
            >
              <SettingsGearIcon className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleCopyVideoUrl}
            title={videoUrl ? "Copy video URL" : "No video loaded"}
            disabled={!videoUrl}
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-[2rem] glass-card text-muted hover:text-white/80 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Link2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleShare}
            className="h-9 sm:h-10 px-3 sm:px-4 rounded-[2rem] bg-amber-500 text-void font-black text-[10px] sm:text-[11px] uppercase tracking-widest hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/10 flex items-center gap-1.5 ring-1 ring-amber-400/60"
          >
            <ShareIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </button>
        </div>
      </nav>

      {/* ── Main bento grid ─────────────────────────────────────────────────── */}
      <main
        className={`relative z-10 flex-1 min-h-0 min-w-0 bento-grid
          ${showSidebar ? "sidebar-open" : "sidebar-closed"}
          ${urlBarPosition === "top" ? "url-top" : ""}
          ${isFullscreen || isTheatre ? "!p-0 !gap-0" : "px-2 sm:px-4 pb-2 sm:pb-4"}`}
        style={{ "--sidebar-width": `${sidebarWidth}px` }}
      >
        {/* URL bar — top position */}
        {!isFullscreen && !isTheatre && urlBarPosition === "top" && (
          <section className="bento-url glass-card" style={{ gridArea: "url" }}>
            <VideoUrlInput
              isHost={isHost}
              currentUrl={videoUrl}
              currentSubtitleUrl={subtitleUrl}
              onLoad={handleLoadUrl}
              strictVideoUrlMode={strictVideoUrlMode}
            />
          </section>
        )}

        {/* Video player — wrapped in React.memo inside video-player/index.js so re-renders
            of RoomClient (e.g. playerChatOpen toggle) don't cause the YouTube iframe to repaint */}
        <section
          ref={bentoVideoRef}
          className={`bento-video glass-card overflow-hidden ${isFullscreen || isTheatre ? "!rounded-none" : ""}`}
        >
          <VideoPlayer
            videoRef={videoRef}
            videoUrl={videoUrl}
            subtitleUrl={subtitleUrl}
            isHost={isHost}
            isPlaying={isPlaying}
            playbackRate={playbackRate}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onSpeed={handleSpeed}
            canControl={canControl}
            onLoad={handleLoadUrl}
            onSubtitleChange={handleSubtitleChange}
            onAmbiColors={handleAmbiColors}
            screenshotEnabled={screenshotEnabled}
            hlsQualityEnabled={hlsQualityEnabled}
            scrubPreviewEnabled={scrubPreviewEnabled}
            onSendScreenshot={handleSendScreenshot}
            addToast={addToast}
            theatreMode={theatreMode}
            onToggleTheatre={handleToggleTheatre}
          />
          {fullscreenChatPortal}
        </section>

        {/* URL bar — bottom position (default) */}
        {!isFullscreen && !isTheatre && urlBarPosition === "bottom" && (
          <section className="bento-url glass-card">
            <VideoUrlInput
              isHost={isHost}
              currentUrl={videoUrl}
              currentSubtitleUrl={subtitleUrl}
              onLoad={handleLoadUrl}
              strictVideoUrlMode={strictVideoUrlMode}
            />
          </section>
        )}

        {/* Sidebar: TMDB banner + chat + participants */}
        {showSidebar && !isFullscreen && !isTheatre && (
          <aside className="bento-sidebar hidden lg:flex relative">
            {/* Drag handle */}
            <div
              className="absolute -left-[10px] top-0 bottom-0 w-5 cursor-col-resize z-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group"
              onMouseDown={onDragStart}
            >
              <div className="w-1 h-12 bg-white/20 rounded-full group-hover:bg-amber-400/80 transition-colors shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            </div>

            {/* Chat panel with optional TMDB banner */}
            <div className="flex-[2] min-h-0 glass-card overflow-hidden flex flex-col relative">
              {tmdbMeta ? (
                // TMDB metadata banner — clickable to open the detail modal
                <div
                  onClick={() => setShowTmdbPanel(true)}
                  className="p-4 border-b border-white/5 bg-black/20 flex gap-4 shrink-0 relative z-10 cursor-pointer hover:bg-white/5 transition-colors group"
                >
                  {tmdbMeta.poster && (
                    <img
                      src={tmdbMeta.poster}
                      alt={tmdbMeta.title}
                      className="w-12 h-[4.5rem] object-cover rounded border border-white/10 shrink-0"
                    />
                  )}
                  <div className="flex flex-col justify-center min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-white/90 truncate group-hover:text-amber-400 transition-colors">
                      {tmdbMeta.title}{" "}
                      {tmdbMeta.year ? `(${tmdbMeta.year})` : ""}
                    </h3>
                    <p className="text-[10px] text-white/50 line-clamp-2 mt-0.5 leading-snug">
                      {tmdbMeta.overview}
                    </p>
                  </div>
                  {isHost && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowTmdbSearch(true);
                        }}
                        className="absolute right-12 top-3 w-7 h-7 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95"
                        style={{
                          backgroundColor: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-muted)",
                        }}
                        title="Change title info"
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTmdbMeta(null);
                        }}
                        className="absolute right-3 top-3 w-7 h-7 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95"
                        style={{
                          backgroundColor: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-muted)",
                        }}
                        title="Clear title info"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ) : (
                // Host-only prompt to identify the currently playing title
                isHost && (
                  <button
                    onClick={() => setShowTmdbSearch(true)}
                    className="p-3 border-b border-white/5 bg-black/10 flex items-center justify-center gap-2 hover:bg-white/5 transition-colors text-[11px] font-mono tracking-widest uppercase opacity-40 hover:opacity-100"
                    style={{ color: "var(--color-muted)" }}
                  >
                    <FilmIcon className="w-3.5 h-3.5" />
                    Search Movie/Series Title
                  </button>
                )
              )}
              <ChatPanel
                messages={messages}
                userId={userId}
                displayNames={displayNames}
                onSend={handleSendChat}
                typingUsers={typingUsers}
                onTyping={handleTyping}
              />
            </div>

            {/* Participants panel */}
            <div className="flex-1 min-h-0 glass-card overflow-hidden flex flex-col">
              <ParticipantList
                participants={participants}
                myUserId={userId}
                hostId={hostId}
                isHost={isHost}
                displayNames={displayNames}
                onKick={handleKick}
                onTransferHost={handleTransferHost}
                tsMap={tsMapState}
                leaderTime={leaderTime}
              />
            </div>
          </aside>
        )}
      </main>

      {/* ── Mobile tab bar ──────────────────────────────────────────────────── */}
      {!isFullscreen && !isTheatre && (
        <div
          className="lg:hidden shrink-0 relative z-20 flex items-center justify-around px-6 py-3 pb-safe backdrop-blur-xl"
          style={{
            borderTop: "1px solid var(--color-border)",
            backgroundColor: "var(--color-void)",
          }}
        >
          <MobileTabBtn
            label={`Chat${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
            active={mobileSheet === "chat"}
            onClick={() => {
              setMobileSheet(mobileSheet === "chat" ? null : "chat");
              if (mobileSheet !== "chat") setUnreadCount(0);
            }}
            icon={
              <div className="relative">
                <ChatIcon className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                )}
              </div>
            }
          />
          <MobileTabBtn
            label={`People (${participants.length})`}
            active={mobileSheet === "users"}
            icon={<UsersIcon className="w-5 h-5" />}
            onClick={() =>
              setMobileSheet(mobileSheet === "users" ? null : "users")
            }
          />
          {nameReady && (
            <MobileTabBtn
              label={displayName.slice(0, 10)}
              active={editingName}
              icon={<PencilIcon className="w-5 h-5" />}
              onClick={() => {
                setNameInput(displayName);
                setEditingName(true);
              }}
            />
          )}
        </div>
      )}

      {/* ── Mobile bottom sheet ─────────────────────────────────────────────── */}
      {mobileSheet && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileSheet(null)}
          />
          <div
            className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-[72vh] flex flex-col backdrop-blur-3xl rounded-t-[3rem] overflow-hidden"
            style={{
              backgroundColor: "var(--color-panel)",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <span className="font-display font-semibold text-white/80">
                {mobileSheet === "chat" ? "Chat" : "Participants"}
              </span>
              <button
                onClick={() => setMobileSheet(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full glass-card text-muted hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              {mobileSheet === "chat" && (
                <ChatPanel
                  messages={messages}
                  userId={userId}
                  displayNames={displayNames}
                  onSend={handleSendChat}
                  typingUsers={typingUsers}
                  onTyping={handleTyping}
                />
              )}
              {mobileSheet === "users" && (
                <ParticipantList
                  participants={participants}
                  myUserId={userId}
                  hostId={hostId}
                  isHost={isHost}
                  displayNames={displayNames}
                  onKick={handleKick}
                  onTransferHost={handleTransferHost}
                  tsMap={tsMapState}
                  leaderTime={leaderTime}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        isHost={isHost}
        hostOnlyControls={hostOnlyControls}
        strictVideoUrlMode={strictVideoUrlMode}
        screenshotEnabled={screenshotEnabled}
        setScreenshotEnabled={setScreenshotEnabled}
        hlsQualityEnabled={hlsQualityEnabled}
        setHlsQualityEnabled={setHlsQualityEnabled}
        scrubPreviewEnabled={scrubPreviewEnabled}
        setScrubPreviewEnabled={setScrubPreviewEnabled}
        speedSyncEnabled={speedSyncEnabled}
        setSpeedSyncEnabled={setSpeedSyncEnabled}
        ambilightEnabled={ambilightEnabled}
        setAmbilightEnabled={setAmbilightEnabled}
        onToggleHostControls={handleToggleHostControls}
        onToggleStrictVideoUrlMode={handleToggleStrictMode}
        hasPassword={hasPassword}
        onSetPassword={handleSetPassword}
        urlBarPosition={urlBarPosition}
        onSetUrlBarPosition={setUrlBarPosition}
      />
      <TmdbPanel
        isOpen={showTmdbPanel}
        onClose={() => setShowTmdbPanel(false)}
        tmdbMeta={tmdbMeta}
      />
      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
      {showTmdbSearch && (
        <TmdbSearch
          onSelect={(item) => updateTmdbMeta(item)}
          onHide={() => setShowTmdbSearch(false)}
        />
      )}
    </div>
  );
}

// ─── CatchUpBanner ────────────────────────────────────────────────────────────
function CatchUpBanner({ videoTS, onSync, onDismiss }) {
  const h = Math.floor(videoTS / 3600);
  const m = Math.floor((videoTS % 3600) / 60);
  const s = Math.floor(videoTS % 60);
  const fmt =
    h > 0
      ? `${h}h ${String(m).padStart(2, "0")}m in`
      : m > 0
        ? `${m}m ${String(s).padStart(2, "0")}s in`
        : `${s}s in`;
  return (
    <div className="relative z-20 shrink-0 flex items-center gap-3 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 backdrop-blur-sm animate-in slide-in-from-top-2 duration-300">
      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
      <p className="flex-1 text-sm font-medium text-amber-200/90 min-w-0">
        <span className="font-bold text-amber-400">You joined {fmt}</span> —
        video has been synced to your position.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onSync}
          className="px-3 py-1.5 rounded-[2rem] bg-amber-500 text-void text-[11px] font-black uppercase tracking-widest hover:bg-amber-400 active:scale-95 transition-all"
        >
          Sync now
        </button>
        <button
          onClick={onDismiss}
          className="w-7 h-7 flex items-center justify-center rounded-full text-amber-400/50 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── MobileTabBtn ─────────────────────────────────────────────────────────────
function MobileTabBtn({ label, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-[2rem] transition-all text-[10px] font-bold uppercase tracking-wider
        ${active ? "text-amber-400 bg-amber-500/10" : "text-muted hover:text-white/60"}`}
    >
      {icon}
      {label}
    </button>
  );
}

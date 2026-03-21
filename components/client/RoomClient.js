"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
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
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
import {
  ShareIcon,
  CrownIcon,
  FilmIcon,
  LockSmallIcon,
  UnlockSmallIcon,
  CcIcon,
  PencilIcon,
  SidebarIcon,
  LockIcon,
  UnlockIcon,
  ChatIcon,
  UsersIcon,
  ShieldIcon,
  SeekIcon,
  SettingsGearIcon,
  KeyboardIcon,
} from "./Icons";
import { getLeaderTime } from "@/lib/sync";

const MAX_MESSAGES = 200;

export default function RoomClient({ roomId, initialMeta }) {
  const router = useRouter();
  const { toasts, addToast } = useToast();

  // ── Identity — use localStorage so userId persists across tab closes ──
  const [userId] = useState(() => {
    if (typeof window === "undefined") return "";
    const key = "wt_userId";
    const stored = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (stored) {
      localStorage.setItem(key, stored); // migrate from sessionStorage
      return stored;
    }
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  });

  const [displayName, setDisplayName] = useState("");
  const [nameReady, setNameReady] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("wt_displayName");
    const name =
      stored || `Guest-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    if (!stored) localStorage.setItem("wt_displayName", name);
    setDisplayName(name);
    setNameReady(true);
  }, []);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const sendRef = useRef(null);

  const commitName = useCallback((raw) => {
    const trimmed = raw.trim().slice(0, 24);
    if (!trimmed) return;
    setDisplayName(trimmed);
    localStorage.setItem("wt_displayName", trimmed);
    sendRef.current?.({ type: "set_name", username: trimmed });
    setEditingName(false);
  }, []);

  // ── Core room state ───────────────────────────────────────────────────
  const [serverState, setServerState] = useState(null);
  const [syncStatus, setSyncStatus] = useState("synced");
  const [connStatus, setConnStatus] = useState("connecting");
  const [participants, setParticipants] = useState([]);
  const [displayNames, setDisplayNames] = useState({});
  const [messages, setMessages] = useState([]);
  const [mobileSheet, setMobileSheet] = useState(null);
  const [tsMapState, setTsMapState] = useState({});
  const [typingUsers, setTypingUsers] = useState({}); // { userId: { username, ts } }
  const typingTimersRef = useRef({});
  const displayNamesRef = useRef(displayNames);
  displayNamesRef.current = displayNames;

  // ── Password ──────────────────────────────────────────────────────────
  const [roomPassword, setRoomPassword] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(`pw_${roomId}`) || "";
  });

  // ── Settings ─────────────────────────────────────────────────────────
  const [screenshotEnabled, setScreenshotEnabled] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("wt_screenshot") !== "false"
      : true,
  );
  const [hlsQualityEnabled, setHlsQualityEnabled] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("wt_hlsquality") !== "false"
      : true,
  );
  const [ambiEnabled, setAmbiEnabled] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("wt_ambi") !== "false"
      : true,
  );
  const [speedSyncEnabled, setSpeedSyncEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    localStorage.setItem("wt_screenshot", screenshotEnabled ? "true" : "false");
  }, [screenshotEnabled]);
  useEffect(() => {
    localStorage.setItem("wt_hlsquality", hlsQualityEnabled ? "true" : "false");
  }, [hlsQualityEnabled]);
  useEffect(() => {
    localStorage.setItem("wt_ambi", ambiEnabled ? "true" : "false");
  }, [ambiEnabled]);

  // ── Sidebar ───────────────────────────────────────────────────────────
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const isDraggingSidebar = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleSidebarDragStart = useCallback(
    (e) => {
      isDraggingSidebar.current = true;
      startX.current = e.clientX;
      startWidth.current = sidebarWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [sidebarWidth],
  );

  useEffect(() => {
    const handleUp = () => {
      if (isDraggingSidebar.current) {
        isDraggingSidebar.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    const handleMove = (e) => {
      if (!isDraggingSidebar.current) return;
      const dx = startX.current - e.clientX;
      setSidebarWidth(Math.max(250, Math.min(startWidth.current + dx, 600)));
    };
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("mousemove", handleMove);
    return () => {
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("mousemove", handleMove);
    };
  }, []);

  // ── Fullscreen / chat overlay ─────────────────────────────────────────
  const [playerChatOpen, setPlayerChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onFS = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) setPlayerChatOpen(false);
    };
    document.addEventListener("fullscreenchange", onFS);
    return () => document.removeEventListener("fullscreenchange", onFS);
  }, []);

  // Global ? shortcut for keyboard help
  useEffect(() => {
    const handler = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(e.target.tagName))
        return;
      if (e.target.isContentEditable) return;
      if (e.key === "?") setShowShortcuts((v) => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const videoRef = useRef(null);

  // Ambilight
  const bentoVideoRef = useRef(null);
  const handleAmbiColors = useCallback((colors) => {
    if (!bentoVideoRef.current) return;
    if (!colors) {
      bentoVideoRef.current.style.boxShadow = "";
      return;
    }
    const { r, g, b } = colors;
    bentoVideoRef.current.style.boxShadow = `0 0 80px 30px rgba(${r},${g},${b},0.18), inset 0 1px 0 rgba(255,255,255,0.055)`;
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleStateUpdate = useCallback((stOrFn) => setServerState(stOrFn), []);

  const handleTsMapUpdate = useCallback((data) => {
    setTsMapState({ ...data });
  }, []);

  const handleChatMessage = useCallback(
    (msg) => {
      if (msg.type === "chat_history") {
        setMessages(msg.messages || []);
        return;
      }
      if (
        !msg.text &&
        !msg.dataUrl &&
        msg.type !== "chat_history" &&
        msg.senderId !== "system"
      )
        return;

      if (msg.senderId === "system") {
        let icon = null,
          type = "info",
          cleanText = msg.text || "";
        if (cleanText.includes("[HOST]")) {
          icon = <CrownIcon className="w-4 h-4 text-amber-500" />;
          cleanText = cleanText.replace("[HOST]", "").trim();
        } else if (cleanText.includes("[VIDEO]")) {
          icon = <FilmIcon className="w-4 h-4 text-jade" />;
          cleanText = cleanText.replace("[VIDEO]", "").trim();
          type = "success";
        } else if (cleanText.includes("[SUBS]")) {
          icon = <CcIcon className="w-4 h-4 text-jade" />;
          cleanText = cleanText.replace("[SUBS]", "").trim();
          type = "success";
        } else if (cleanText.includes("[LOCK]")) {
          icon = <LockSmallIcon className="w-4 h-4 text-amber-400" />;
          cleanText = cleanText.replace("[LOCK]", "").trim();
          type = "info";
        } else if (cleanText.includes("[UNLOCK]")) {
          icon = <UnlockSmallIcon className="w-4 h-4 text-jade" />;
          cleanText = cleanText.replace("[UNLOCK]", "").trim();
          type = "success";
        } else if (cleanText.includes("[STRICT_ON]")) {
          icon = <ShieldIcon className="w-4 h-4 text-jade" />;
          cleanText = cleanText.replace("[STRICT_ON]", "").trim();
          type = "success";
        } else if (cleanText.includes("[STRICT_OFF]")) {
          icon = <ShieldIcon className="w-4 h-4 text-white/40" />;
          cleanText = cleanText.replace("[STRICT_OFF]", "").trim();
          type = "info";
        } else if (cleanText.includes("[STRICT]")) {
          icon = <ShieldIcon className="w-4 h-4 text-danger" />;
          cleanText = cleanText.replace("[STRICT]", "").trim();
          type = "error";
        } else if (cleanText.includes("[SEEK]")) {
          icon = <SeekIcon className="w-4 h-4 text-amber-400" />;
          cleanText = cleanText.replace("[SEEK]", "").trim();
        }
        addToast(cleanText, type, 4000, icon);
        return;
      }
      setMessages((prev) => [...prev, msg].slice(-MAX_MESSAGES));
      const isMobile =
        typeof window !== "undefined" && window.innerWidth < 1024;
      const isVisible = document.fullscreenElement
        ? playerChatOpen
        : isMobile
          ? mobileSheet === "chat"
          : showSidebar;
      if (!isVisible) setUnreadCount((prev) => prev + 1);
    },
    [mobileSheet, showSidebar, playerChatOpen, addToast],
  );

  const handleUserChange = useCallback(
    (event) => {
      if (!event || typeof event !== "object") return;
      switch (event.type) {
        case "reset":
          setParticipants([]);
          setDisplayNames({});
          break;
        case "participants":
          setParticipants((event.users || []).map((u) => u.userId));
          setDisplayNames((prev) => {
            const next = { ...prev };
            (event.users || []).forEach((u) => {
              next[u.userId] = u.username;
            });
            return next;
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
          // Auto-expire after 3.5s
          clearTimeout(typingTimersRef.current[event.userId]);
          typingTimersRef.current[event.userId] = setTimeout(() => {
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

  const handleKicked = useCallback(() => {
    router.push("/?kicked=1");
  }, [router]);
  const handleSendChat = useCallback(
    (text, dataUrl) => sendRef.current?.({ type: "chat", text, dataUrl }),
    [],
  );
  const handleLoadUrl = useCallback(
    (url, subUrl) =>
      sendRef.current?.({
        type: "change_video",
        videoUrl: url,
        subtitleUrl: subUrl,
      }),
    [],
  );
  const handleSubtitleChange = useCallback(
    (subUrl) => sendRef.current?.({ type: "set_subtitle", url: subUrl }),
    [],
  );
  const handleTyping = useCallback(
    () => sendRef.current?.({ type: "typing" }),
    [],
  );

  const handlePlay = useCallback((time) => {
    setServerState((s) => ({
      ...(s || {}),
      isPlaying: true,
      currentTime: time,
    }));
    sendRef.current?.({ type: "play", currentTime: time });
  }, []);
  const handlePause = useCallback((time) => {
    setServerState((s) => ({
      ...(s || {}),
      isPlaying: false,
      currentTime: time,
    }));
    sendRef.current?.({ type: "pause", currentTime: time });
  }, []);
  const handleSeek = useCallback((time) => {
    setServerState((s) => ({ ...(s || {}), currentTime: time }));
    sendRef.current?.({ type: "seek", currentTime: time });
  }, []);
  const handleSpeed = useCallback((rate) => {
    const time = videoRef.current?.currentTime || 0;
    setServerState((s) => ({
      ...(s || {}),
      playbackRate: rate,
      currentTime: time,
      lastUpdated: Date.now(),
    }));
    sendRef.current?.({ type: "speed", rate, currentTime: time });
  }, []);
  const handleKick = useCallback(
    (tid) => sendRef.current?.({ type: "kick", targetUserId: tid }),
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

  const handleShare = useCallback(() => {
    addToast("Link copied!", "success");
    navigator.clipboard
      ?.writeText(`${window.location.origin}/room/${roomId}`)
      .catch(() => {});
  }, [addToast, roomId]);

  const hostToken = useMemo(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(`host_${roomId}`) || "";
  }, [roomId]);

  // ── Derived state ─────────────────────────────────────────────────────
  const isHost = serverState?.hostId === userId;
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
  const hasPassword = serverState?.hasPassword ?? false;
  const canControl = !hostOnlyControls || isHost;

  // Connection quality leader time
  const leaderTime = useMemo(() => getLeaderTime(tsMapState), [tsMapState]);

  // Speed sync: apply host's playbackRate to all viewers when speedSyncEnabled
  // (server already broadcasts playbackRate in REC:host; the video player
  //  applies it via the playbackRate prop — this is already handled)

  // ── Chat overlay (fullscreen) ─────────────────────────────────────────
  const chatOverlay = isFullscreen ? (
    <div className="absolute top-3 right-4 sm:top-4 sm:right-6 lg:right-4 z-30 flex flex-col items-end pointer-events-none">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setPlayerChatOpen((v) => {
            if (!v) setUnreadCount(0);
            return !v;
          });
        }}
        className="pointer-events-auto w-10 h-10 flex items-center justify-center rounded-[2rem] bg-black/40 backdrop-blur-md text-white/70 hover:text-white transition-all ring-1 ring-white/10 shadow-xl"
        title={playerChatOpen ? "Close Chat" : "Open Chat"}
      >
        <ChatIcon className="w-5 h-5" />
        {!playerChatOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-void animate-pulse" />
        )}
      </button>
      {playerChatOpen && (
        <div
          className="pointer-events-auto mt-2 w-80 sm:w-96 h-[450px] sm:h-[550px] max-h-[85vh] rounded-[2.5rem] border border-white/10 bg-black/30 backdrop-blur-2xl overflow-hidden flex flex-col shadow-2xl animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0 bg-white/5">
            <span className="font-display font-bold text-sm text-white/90 tracking-wide">
              Room Chat
            </span>
            <button
              onClick={() => setPlayerChatOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 min-h-0 relative">
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
    </div>
  ) : null;

  return (
    <div className="h-dvh bg-void flex flex-col overflow-hidden text-text font-body antialiased">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_15%_20%,rgba(245,158,11,0.07),transparent_50%),radial-gradient(ellipse_at_85%_80%,rgba(16,185,129,0.05),transparent_50%)]"
      />

      {userId && nameReady && (
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
          onTsMapUpdate={handleTsMapUpdate}
          roomPassword={roomPassword}
        />
      )}

      <ReconnectBanner connStatus={connStatus} />
      <ToastContainer toasts={toasts} />

      <RoomNavbar
        roomId={roomId}
        displayName={displayName}
        nameReady={nameReady}
        editingName={editingName}
        nameInput={nameInput}
        setNameInput={setNameInput}
        setEditingName={setEditingName}
        commitName={commitName}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        unreadCount={unreadCount}
        setUnreadCount={setUnreadCount}
        syncStatus={syncStatus}
        connStatus={connStatus}
        isHost={isHost}
        hostOnlyControls={hostOnlyControls}
        handleToggleHostControls={handleToggleHostControls}
        strictVideoUrlMode={strictVideoUrlMode}
        handleToggleStrictMode={handleToggleStrictMode}
        handleShare={handleShare}
        router={router}
        onOpenSettings={() => setShowSettings(true)}
        onOpenShortcuts={() => setShowShortcuts(true)}
        hasPassword={hasPassword}
      />

      <main
        className={`relative z-10 flex-1 min-h-0 min-w-0 bento-grid px-2 sm:px-4 pb-2 sm:pb-4 ${showSidebar ? "sidebar-open" : "sidebar-closed"}`}
        style={{ "--sidebar-width": `${sidebarWidth}px` }}
      >
        <section
          ref={bentoVideoRef}
          className="bento-video glass-card overflow-hidden"
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
            chatOverlay={chatOverlay}
            onLoad={handleLoadUrl}
            onSubtitleChange={handleSubtitleChange}
            onAmbiColors={handleAmbiColors}
            screenshotEnabled={screenshotEnabled}
            hlsQualityEnabled={hlsQualityEnabled}
            ambiEnabled={ambiEnabled}
            onSendScreenshot={(dataUrl) =>
              handleSendChat("📸 Screenshot", dataUrl)
            }
          />
        </section>
        <section className="bento-url glass-card">
          <VideoUrlInput
            isHost={isHost}
            currentUrl={videoUrl}
            currentSubtitleUrl={subtitleUrl}
            onLoad={handleLoadUrl}
            strictVideoUrlMode={strictVideoUrlMode}
          />
        </section>
        {showSidebar && (
          <aside className="bento-sidebar hidden lg:flex relative">
            <div
              className="absolute -left-[10px] top-0 bottom-0 w-5 cursor-col-resize z-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group"
              onMouseDown={handleSidebarDragStart}
            >
              <div className="w-1 h-12 bg-white/20 rounded-full group-hover:bg-amber-400/80 transition-colors shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            </div>
            <div className="flex-[2] min-h-0 glass-card overflow-hidden flex flex-col">
              <ChatPanel
                messages={messages}
                userId={userId}
                displayNames={displayNames}
                onSend={handleSendChat}
                typingUsers={typingUsers}
                onTyping={handleTyping}
              />
            </div>
            <div className="flex-1 min-h-0 glass-card overflow-hidden flex flex-col">
              <ParticipantList
                participants={participants}
                myUserId={userId}
                hostId={hostId}
                isHost={isHost}
                displayNames={displayNames}
                onKick={handleKick}
                tsMap={tsMapState}
                leaderTime={leaderTime}
              />
            </div>
          </aside>
        )}
      </main>

      {/* Mobile tab bar */}
      <div className="lg:hidden shrink-0 relative z-20 flex items-center justify-around px-6 py-3 pb-safe border-t border-white/5 bg-void/85 backdrop-blur-xl">
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
          onClick={() =>
            setMobileSheet(mobileSheet === "users" ? null : "users")
          }
          icon={<UsersIcon className="w-5 h-5" />}
        />
        {nameReady && (
          <MobileTabBtn
            label={displayName.slice(0, 10)}
            active={editingName}
            onClick={() => {
              setNameInput(displayName);
              setEditingName(true);
            }}
            icon={<PencilIcon className="w-5 h-5" />}
          />
        )}
      </div>

      {/* Mobile sheet */}
      {mobileSheet && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileSheet(null)}
          />
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-[72vh] flex flex-col bg-surface/95 backdrop-blur-3xl border-t border-white/10 rounded-t-[3rem] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
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
                  tsMap={tsMapState}
                  leaderTime={leaderTime}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* Settings panel */}
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
        speedSyncEnabled={speedSyncEnabled}
        setSpeedSyncEnabled={setSpeedSyncEnabled}
        onToggleHostControls={handleToggleHostControls}
        onToggleStrictVideoUrlMode={handleToggleStrictMode}
        hasPassword={hasPassword}
        onSetPassword={handleSetPassword}
        ambiEnabled={ambiEnabled}
        setAmbiEnabled={setAmbiEnabled}
      />

      {/* Keyboard shortcuts modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}

function RoomNavbar({
  roomId,
  displayName,
  nameReady,
  editingName,
  nameInput,
  setNameInput,
  setEditingName,
  commitName,
  showSidebar,
  setShowSidebar,
  unreadCount,
  setUnreadCount,
  syncStatus,
  connStatus,
  isHost,
  hostOnlyControls,
  handleToggleHostControls,
  strictVideoUrlMode,
  handleToggleStrictMode,
  handleShare,
  router,
  onOpenSettings,
  onOpenShortcuts,
  hasPassword,
}) {
  return (
    <nav className="relative z-10 shrink-0 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
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
            <span
              title="Password protected"
              className="text-amber-400/60 text-[9px]"
            >
              🔒
            </span>
          )}
          <span className="text-white/70 font-black hidden xs:inline">
            {roomId}
          </span>
          <span className="text-white/70 font-black xs:hidden">
            {roomId.slice(0, 4)}
          </span>
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
              title="Click to edit your name"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-[2rem] glass-card hover:border-white/15 transition-all text-[10px] font-mono text-white/50 hover:text-white/80 max-w-[140px] min-w-0"
            >
              <PencilIcon className="w-3 h-3 shrink-0" />
              <span className="truncate">{displayName}</span>
            </button>
          ))}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => {
            setShowSidebar(!showSidebar);
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

        {/* Keyboard shortcuts */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard shortcuts (?)"
          className="w-9 h-9 flex items-center justify-center rounded-[2rem] glass-card text-muted hover:text-white/80 transition-all active:scale-95"
        >
          <KeyboardIcon className="w-4 h-4" />
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          title="Room settings"
          className="w-9 h-9 flex items-center justify-center rounded-[2rem] glass-card text-muted hover:text-white/80 transition-all active:scale-95"
        >
          <SettingsGearIcon className="w-4 h-4" />
        </button>

        <button
          onClick={handleShare}
          aria-label="Copy invite link"
          className="h-9 sm:h-10 px-3 sm:px-4 rounded-[2rem] bg-amber-500 text-void font-black text-[10px] sm:text-[11px] uppercase tracking-widest hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/10 flex items-center gap-1.5 ring-1 ring-amber-400/60"
        >
          <ShareIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Invite</span>
        </button>
      </div>
    </nav>
  );
}

function MobileTabBtn({ label, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-[2rem] transition-all text-[10px] font-bold uppercase tracking-wider ${active ? "text-amber-400 bg-amber-500/10" : "text-muted hover:text-white/60"}`}
    >
      {icon}
      {label}
    </button>
  );
}

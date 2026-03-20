"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import SyncEngine from "./SyncEngine";
import VideoPlayer from "./VideoPlayer";
import VideoUrlInput from "./VideoUrlInput";
import ChatPanel from "./ChatPanel";
import ParticipantList from "./ParticipantList";
import SyncStatusIndicator from "./SyncStatusIndicator";
import ReconnectBanner from "./ReconnectBanner";
import ToastContainer, { useToast } from "./Toast";
import { ShareIcon } from "./Icons";

const MAX_MESSAGES = 200;

export default function RoomClient({ roomId, initialMeta }) {
  const router = useRouter();
  const { toasts, addToast } = useToast();

  const [userId] = useState(() => {
    if (typeof window === "undefined") return "";
    const key = "wt_userId";
    const stored = sessionStorage.getItem(key);
    if (stored) return stored;
    const id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
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

  const [serverState, setServerState] = useState(null);
  const [syncStatus, setSyncStatus] = useState("synced");
  const [connStatus, setConnStatus] = useState("connecting");
  const [participants, setParticipants] = useState([]);
  const [displayNames, setDisplayNames] = useState({});
  const [messages, setMessages] = useState([]);
  const [mobileSheet, setMobileSheet] = useState(null);

  const [showSidebar, setShowSidebar] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const videoRef = useRef(null);

  const handleStateUpdate = useCallback((stOrFn) => setServerState(stOrFn), []);

  const handleChatMessage = useCallback(
    (msg) => {
      setMessages((prev) => {
        const next = [...prev, msg].slice(-MAX_MESSAGES);
        return next;
      });

      const isMobile =
        typeof window !== "undefined" && window.innerWidth < 1024;
      const isVisible = isMobile ? mobileSheet === "chat" : showSidebar;
      if (!isVisible) {
        setUnreadCount((prev) => prev + 1);
      }
    },
    [mobileSheet, showSidebar],
  );

  const handleUserChange = useCallback((event) => {
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
          if (event.userId !== userId) {
            addToast(`${event.username} joined!`);
          }
        }
        break;
      case "user_left":
        const leaverName = displayNames[event.userId] || "Someone";
        setParticipants((prev) => prev.filter((id) => id !== event.userId));
        addToast(`${leaverName} left.`);
        break;
      case "name_changed":
        setDisplayNames((prev) => ({
          ...prev,
          [event.userId]: event.username,
        }));
        break;
    }
  }, []);

  const handleKicked = useCallback(() => {
    router.push("/?kicked=1");
  }, [router]);

  const handleSendChat = useCallback(
    (text) => sendRef.current?.({ type: "chat", text }),
    [],
  );
  const handleLoadUrl = useCallback(
    (url) => sendRef.current?.({ type: "change_video", videoUrl: url }),
    [],
  );
  const handlePlay = useCallback(
    (time) => sendRef.current?.({ type: "play", currentTime: time }),
    [],
  );
  const handlePause = useCallback(
    (time) => sendRef.current?.({ type: "pause", currentTime: time }),
    [],
  );
  const handleSeek = useCallback(
    (time) => sendRef.current?.({ type: "seek", currentTime: time }),
    [],
  );
  const handleSpeed = useCallback(
    (rate) => sendRef.current?.({ type: "speed", rate }),
    [],
  );
  const handleKick = useCallback(
    (tid) => sendRef.current?.({ type: "kick", targetUserId: tid }),
    [],
  );

  const handleShare = useCallback(() => {
    addToast("Link copied!");
    const shareUrl = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
  }, [addToast, roomId]);

  const hostToken = useMemo(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(`host_${roomId}`) || "";
  }, [roomId]);

  const isHost = Boolean(hostToken && serverState?.hostId === userId);
  const hostId = serverState?.hostId ?? null;
  const isPlaying = serverState?.isPlaying ?? false;
  const playbackRate = serverState?.playbackRate ?? 1;
  const videoUrl = serverState?.videoUrl ?? initialMeta?.videoUrl ?? "";

  const nameLabel = nameReady ? displayName : "";

  return (
    <div className="h-dvh bg-void flex flex-col overflow-hidden text-text font-body antialiased">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0
        bg-[radial-gradient(ellipse_at_15%_20%,rgba(245,158,11,0.07),transparent_50%),
            radial-gradient(ellipse_at_85%_80%,rgba(16,185,129,0.05),transparent_50%)]"
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
          onDriftStatus={setSyncStatus}
          onConnStatus={setConnStatus}
          onKicked={handleKicked}
          sendRef={sendRef}
        />
      )}

      <ReconnectBanner connStatus={connStatus} />
      <ToastContainer toasts={toasts} />

      <nav className="relative z-10 shrink-0 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl glass-card hover:border-white/15 transition-all active:scale-95 shrink-0"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center font-display font-black text-void text-[10px]">
              WT
            </div>
            <span className="font-display font-bold text-base tracking-tight text-white/90 hidden md:block">
              WatchTogether
            </span>
          </button>

          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl glass-card text-[10px] font-mono uppercase tracking-[0.2em] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-jade/70 animate-pulse" />
            <span className="text-white/70 font-black">{roomId}</span>
          </div>

          {nameReady &&
            (editingName ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  commitName(nameInput);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-2xl glass-card min-w-0"
              >
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={() => commitName(nameInput || displayName)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setEditingName(false);
                    }
                  }}
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
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl glass-card
                           hover:border-white/15 transition-all text-[10px] font-mono
                           text-white/50 hover:text-white/80 max-w-[140px] min-w-0"
              >
                <PencilIcon className="w-3 h-3 shrink-0" />
                <span className="truncate">{nameLabel}</span>
              </button>
            ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setShowSidebar((v) => !v);
              if (!showSidebar) setUnreadCount(0);
            }}
            title={showSidebar ? "Hide sidebar" : "Show sidebar"}
            className="hidden lg:flex w-9 h-9 items-center justify-center rounded-xl glass-card
                       text-muted hover:text-white/80 transition-all active:scale-95 relative"
          >
            <SidebarIcon className="w-4 h-4" />
            {!showSidebar && unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-void
                             flex items-center justify-center text-[8px] font-bold text-void"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <div className="px-3 py-2 rounded-2xl glass-card">
            <SyncStatusIndicator
              syncStatus={syncStatus}
              connStatus={connStatus}
            />
          </div>

          <button
            onClick={handleShare}
            aria-label="Copy invite link"
            className="h-10 px-4 rounded-2xl bg-amber-500 text-void font-black text-[11px] uppercase tracking-widest
                       hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/10
                       flex items-center gap-1.5 ring-1 ring-amber-400/60"
          >
            <ShareIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </button>
        </div>
      </nav>

      <main
        className={`relative z-10 flex-1 min-h-0 bento-grid px-4 pb-4 ${showSidebar ? "sidebar-open" : "sidebar-closed"}`}
      >
        <section className="bento-video glass-card overflow-hidden">
          <VideoPlayer
            videoRef={videoRef}
            videoUrl={videoUrl}
            isHost={isHost}
            isPlaying={isPlaying}
            playbackRate={playbackRate}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onSpeed={handleSpeed}
          />
        </section>

        <section className="bento-url glass-card">
          <VideoUrlInput
            isHost={isHost}
            currentUrl={videoUrl}
            onLoad={handleLoadUrl}
          />
        </section>

        {showSidebar && (
          <aside className="bento-sidebar hidden lg:flex">
            <div className="flex-[2] min-h-0 glass-card overflow-hidden flex flex-col">
              <ChatPanel
                messages={messages}
                userId={userId}
                displayNames={displayNames}
                onSend={handleSendChat}
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
              />
            </div>
          </aside>
        )}
      </main>
      <div
        className="lg:hidden shrink-0 relative z-20 flex items-center justify-around
                      px-6 py-3 pb-safe border-t border-white/5 bg-void/85 backdrop-blur-xl"
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
      {mobileSheet && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileSheet(null)}
          />
          <div
            className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-[72vh] flex flex-col
                          bg-surface/95 backdrop-blur-3xl border-t border-white/10 rounded-t-3xl overflow-hidden"
          >
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
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MobileTabBtn({ label, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all text-[10px] font-bold uppercase tracking-wider
        ${active ? "text-amber-400 bg-amber-500/10" : "text-muted hover:text-white/60"}`}
    >
      {icon}
      {label}
    </button>
  );
}

function PencilIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}
function SidebarIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
      />
    </svg>
  );
}
function ChatIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    </svg>
  );
}
function UsersIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

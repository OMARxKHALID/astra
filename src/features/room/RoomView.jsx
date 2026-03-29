"use client";

import { useRef, useCallback, useMemo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Share2 as ShareIcon,
  Crown as CrownIcon,
  MessageSquare as ChatIcon,
  Users as UsersIcon,
  Shield as ShieldIcon,
  SkipForward as SeekIcon,
  Settings as SettingsIcon,
  Keyboard as KeyboardIcon,
  Pencil as PencilIcon,
  PanelRight as SidebarIcon,
  Monitor as TheatreIcon,
  ExternalLink as PopoutIcon,
  Link as LinkIcon,
} from "lucide-react";

import SyncEngine from "@/features/sync/components/SyncEngine";
import VideoPlayer from "@/features/video";
import { getLeaderTime } from "@/lib/syncManager";
import { LS_KEYS, MAX_HISTORY_ENTRIES } from "@/constants/config";
import URLBar from "./URLBar";
import ChatSidebar from "./ChatSidebar";
import UserList from "./UserList";
import SyncStatusIndicator from "@/components/SyncStatusIndicator";
import ReconnectBanner from "@/components/ReconnectBanner";
import ToastContainer, { useToast } from "@/components/Toast";
import SettingsPanel from "./SettingsPanel";
import ShortcutsModal from "@/components/ShortcutsModal";
import PasswordModal from "@/components/PasswordModal";

import useUser from "./hooks/useUser";
import useSettings from "./hooks/useSettings";
import useRoomState from "./hooks/useRoomState";
import useRoomEvents from "./hooks/useRoomEvents";
import useSidebar from "./hooks/useSidebar";
import { ls } from "@/utils/localStorage";

export default function RoomView({ roomId, initialMeta }) {
  const router = useRouter();
  const { toasts, addToast } = useToast();

  // [Note] Hydration guard for localStorage access
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const sendRef = useRef(null);
  const typingTimersRef = useRef({});
  const identity = useUser(sendRef);
  const settings = useSettings();
  const room = useRoomState(initialMeta);
  const sidebar = useSidebar();
  const { handleChatMessage, handleUserChange, handleKicked } = useRoomEvents({
    userId: identity.userId,
    addToast,
    setServerState: room.setServerState,
    setTsMapState: room.setTsMapState,
    setParticipants: room.setParticipants,
    setDisplayNames: room.setDisplayNames,
    displayNamesRef: room.displayNamesRef,
    setMessages: room.setMessages,
    setTypingUsers: room.setTypingUsers,
    typingTimers: typingTimersRef,
    setUnreadCount: room.setUnreadCount || (() => {}),
    playerChatOpen: room.playerChatOpen,
    mobileSheet: room.mobileSheet,
    showSidebar: settings.showSidebar,
    handleWrongPassword: () => room.setNeedsPassword(true),
    router,
  });

  const videoRef = useRef(null);
  const bentoVideoRef = useRef(null);
  const rootAmbiRef = useRef(null);
  const socketRef = useRef(null);

  // [Note] fullscreenchange fires from the Fullscreen API; drives layout collapse
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // [Note] radial glow sampling
  const handleAmbiColors = useCallback(
    (colors) => {
      const overlay = rootAmbiRef.current;
      if (overlay) {
        if (colors && settings.ambilightEnabled) {
          overlay.style.opacity = "1";
          overlay.style.background = `radial-gradient(ellipse 100% 100% at 50% 0%, rgba(${colors.r},${colors.g},${colors.b},0.4) 0%, transparent 100%)`;
        } else {
          overlay.style.opacity = "0";
        }
      }
      const section = bentoVideoRef.current;
      if (section) {
        section.style.boxShadow =
          colors && settings.ambilightEnabled
            ? `0 0 100px 30px rgba(${colors.r},${colors.g},${colors.b},0.35), inset 0 1px 0 rgba(255,255,255,0.055)`
            : "";
      }
    },
    [settings.ambilightEnabled],
  );

  const { sidebarWidth, onDragStart } = sidebar;

  const hostToken = ls.get(`host_${roomId}`) || "";
  const isHost =
    room.serverState?.hostId === identity.userId ||
    (!!hostToken && !room.serverState);
  const videoUrl =
    room.serverState?.videoUrl !== undefined
      ? room.serverState.videoUrl
      : initialMeta?.videoUrl || "";

  const subtitleUrl =
    room.serverState?.subtitleUrl ?? initialMeta?.subtitleUrl ?? "";
  const canControl = !(room.serverState?.hostOnlyControls ?? false) || isHost;
  const leaderTime = useMemo(
    () => getLeaderTime(room.tsMapState),
    [room.tsMapState],
  );
  const isTheatre = settings.theatreMode && !isFullscreen;
  const [fsChatOpen, setFsChatOpen] = useState(false);

  // [Note] Persist watch history to LS
  const historySavedRef = useRef(false);
  useEffect(() => {
    if (!room.serverState || historySavedRef.current || !videoUrl) return;
    historySavedRef.current = true;
    try {
      const history = JSON.parse(ls.get(LS_KEYS.history) || "[]");
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
        videoTS: room.serverState.currentTime || 0,
        lastVisited: Date.now(),
        isHost,
      };
      ls.set(
        LS_KEYS.history,
        JSON.stringify(
          [entry, ...history.filter((h) => h.roomId !== roomId)].slice(0, MAX_HISTORY_ENTRIES)
        )
      );
    } catch {}
  }, [room.serverState, videoUrl, roomId, isHost]);

  const handleCatchUp = useCallback(() => {
    room.setLateJoinTime(null);
    const v = videoRef.current;
    if (!v) return;
    const times = Object.values(room.tsMapState)
      .filter((t) => typeof t === "number")
      .sort((a, b) => a - b);
    if (times.length) v.currentTime = times[Math.floor(times.length / 2)];
  }, [room.tsMapState]);

  if (!mounted) return null;

  return (
    <div
      className={`h-dvh flex flex-col overflow-hidden font-body antialiased ${settings.theatreMode ? "theatre-mode" : ""}`}
    >
      <div
        ref={rootAmbiRef}
        aria-hidden
        className="fixed inset-0 z-5 pointer-events-none opacity-0 transition-opacity duration-600"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_15%_20%,rgba(245,158,11,0.07),transparent_50%),radial-gradient(ellipse_at_85%_80%,rgba(10,185,129,0.05),transparent_50%)]"
      />

      {identity.userId && identity.nameReady && room.syncEnabled && (
        <SyncEngine
          roomId={roomId}
          userId={identity.userId}
          hostToken={
            typeof window !== "undefined"
              ? ls.get(`host_${roomId}`) || ""
              : ""
          }
          videoUrl={videoUrl}
          displayName={identity.displayName}
          videoRef={videoRef}
          onStateUpdate={room.handleStateUpdate}
          onChatMessage={handleChatMessage}
          onUserChange={handleUserChange}
          participants={room.participants}
          onDriftStatus={room.setSyncStatus}
          onConnStatus={room.setConnStatus}
          onKicked={handleKicked}
          sendRef={sendRef}
          socketRef={socketRef}
          onTsMapUpdate={room.handleTsMapUpdate}
          onLateJoin={room.setLateJoinTime}
          onReconnected={() => addToast("Reconnected!", "success")}
          roomPassword={room.roomPassword}
          speedSyncEnabled={settings.speedSyncEnabled}
        />
      )}

      <ReconnectBanner connStatus={room.connStatus} />
      <ToastContainer toasts={toasts} />

      {room.lateJoinTime && !isFullscreen && (
        <CatchUpBanner
          videoTS={room.lateJoinTime}
          onSync={handleCatchUp}
          onDismiss={() => room.setLateJoinTime(null)}
        />
      )}

      <nav className="room-navbar relative z-30 shrink-0 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-pill)] glass-card hover:border-white/15 transition-all active:scale-95 shrink-0"
          >
            <div className="w-7 h-7 rounded-[var(--radius-pill)] bg-amber flex items-center justify-center font-display font-black text-void text-[10px]">
              WT
            </div>
            <span className="font-display font-bold text-base tracking-tight text-white/90 hidden md:block">
              WatchTogether
            </span>
          </button>

          <div className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-pill)] glass-card text-[10px] font-mono uppercase tracking-[0.2em] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-jade/70 animate-pulse" />
            <span className="text-white/70 font-black hidden xs:inline">
              {roomId}
            </span>
            <span className="text-white/70 font-black xs:hidden">
              {roomId?.slice?.(0, 4)}
            </span>
          </div>

          {identity.nameReady &&
            (identity.editingName ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  identity.commitName(identity.nameInput);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-pill)] glass-card min-w-0"
              >
                <input
                  autoFocus
                  value={identity.nameInput}
                  onChange={(e) => identity.setNameInput(e.target.value)}
                  onBlur={() =>
                    identity.commitName(
                      identity.nameInput || identity.displayName,
                    )
                  }
                  maxLength={24}
                  className="w-28 bg-transparent text-xs font-mono text-white/80 outline-none"
                />
              </form>
            ) : (
              <button
                onClick={() => {
                  identity.setNameInput(identity.displayName);
                  identity.setEditingName(true);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-pill)] glass-card hover:border-white/15 transition-all text-[10px] font-mono text-white/50 hover:text-white/80 max-w-[140px] min-w-0"
              >
                <PencilIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{identity.displayName}</span>
              </button>
            ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              const next = !settings.showSidebar;
              settings.setShowSidebar(next);
              if (next) room.setUnreadCount(0);
            }}
            className={`relative w-9 h-9 items-center justify-center rounded-[var(--radius-pill)] glass-card transition-all hidden lg:flex ${settings.showSidebar ? "text-amber-400 bg-amber-400/5" : "text-muted hover:text-white"}`}
          >
            <SidebarIcon className="w-4 h-4" />
            {!settings.showSidebar && room.unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            )}
          </button>

          <div className="px-3 py-2 rounded-[var(--radius-pill)] glass-card">
            <SyncStatusIndicator
              syncStatus={room.syncStatus}
              connStatus={room.connStatus}
            />
          </div>

          <button
            onClick={() => settings.setTheatreMode(!settings.theatreMode)}
            className={`w-9 h-9 items-center justify-center rounded-[var(--radius-pill)] glass-card transition-all hidden lg:flex ${isTheatre ? "text-amber-400 bg-amber-400/5" : "text-muted hover:text-white"}`}
          >
            <TheatreIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => settings.setShowShortcuts(true)}
            className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-pill)] glass-card text-muted hover:text-white transition-all"
          >
            <KeyboardIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => settings.setShowSettings(true)}
            className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-pill)] glass-card text-muted hover:text-white"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() =>
              window.open(
                window.location.href,
                "_blank",
                "width=800,height=600",
              )
            }
            className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-pill)] glass-card text-muted hover:text-white"
            title="Popout player"
          >
            <PopoutIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (!videoUrl) {
                addToast("No video currently playing", "warning");
                return;
              }
              navigator.clipboard.writeText(videoUrl);
              addToast("Video URL copied!", "success");
            }}
            className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-pill)] glass-card text-muted hover:text-white transition-all active:scale-95"
            title="Copy current video URL"
          >
            <LinkIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              addToast("Room link copied!", "success");
            }}
            className="h-9 sm:h-10 px-3 sm:px-4 rounded-[var(--radius-pill)] bg-amber text-void font-black text-[10px] sm:text-[11px] uppercase tracking-widest hover:bg-amber-400 active:scale-95 transition-all shadow-lg flex items-center gap-1.5 ring-1 ring-amber-400/60"
          >
            <ShareIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </button>
        </div>
      </nav>

      <main
        className={`relative z-10 flex-1 min-h-0 min-w-0 bento-grid
          ${settings.showSidebar ? "sidebar-open" : "sidebar-closed"}
          ${isFullscreen || isTheatre ? "!p-0 !gap-0" : "px-2 sm:px-4 pb-2 sm:pb-4"}`}
        style={{ "--sidebar-width": `${sidebarWidth}px` }}
      >
        {!isFullscreen && !isTheatre && (
          <section className="bento-url glass-card">
            <URLBar
              onLoad={(url, sub) =>
                sendRef.current?.({
                  type: "change_video",
                  videoUrl: url,
                  subtitleUrl: sub,
                })
              }
              currentUrl={videoUrl}
              currentSubtitleUrl={subtitleUrl}
              isHost={isHost}
              strictVideoUrlMode={room.serverState?.strictVideoUrlMode}
            />
          </section>
        )}

        <section
          ref={bentoVideoRef}
          className={`bento-video glass-card overflow-hidden ${isFullscreen || isTheatre ? "!rounded-none" : ""}`}
        >
          <VideoPlayer
            videoRef={videoRef}
            videoUrl={videoUrl}
            subtitleUrl={subtitleUrl}
            isHost={isHost}
            isPlaying={room.serverState?.isPlaying}
            playbackRate={room.serverState?.playbackRate || 1}
            onPlay={(t) => sendRef.current?.({ type: "play", currentTime: t })}
            onPause={(t) =>
              sendRef.current?.({ type: "pause", currentTime: t })
            }
            onSeek={(t) => sendRef.current?.({ type: "seek", currentTime: t })}
            onSpeed={(r) =>
              sendRef.current?.({
                type: "speed",
                rate: r,
                currentTime: videoRef.current?.currentTime,
              })
            }
            canControl={canControl}
            onAmbiColors={handleAmbiColors}
            theatreMode={settings.theatreMode}
            onToggleTheatre={() =>
              settings.setTheatreMode(!settings.theatreMode)
            }
            onToggleChat={() => setFsChatOpen((o) => !o)}
          />
        </section>

        {settings.showSidebar && !isFullscreen && !isTheatre && (
          <aside className="bento-sidebar hidden lg:flex flex-col gap-3 min-h-0 relative">
            <div
              className="absolute -left-[14px] top-0 bottom-0 w-7 cursor-col-resize z-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group"
              onMouseDown={onDragStart}
            >
              <div className="w-1.5 h-16 bg-white/10 rounded-full group-hover:bg-amber-400/60 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.3)]" />
            </div>

            <div className="glass-card flex-1 min-h-0 flex flex-col relative overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 rounded-full bg-amber/10 flex items-center justify-center text-amber">
                  <ChatIcon className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono font-black text-white/70 uppercase tracking-widest">
                    Live Feed
                  </span>
                  <span className="text-[9px] font-mono text-white/30 uppercase">
                    {room.messages.length} messages
                  </span>
                </div>
              </div>
              <ChatSidebar
                messages={room.messages}
                userId={identity.userId}
                displayNames={room.displayNames}
                onSend={(t, d) =>
                  sendRef.current?.({ type: "chat", text: t, dataUrl: d })
                }
                typingUsers={room.typingUsers}
                onTyping={() => sendRef.current?.({ type: "typing" })}
              />
            </div>

            <div className="glass-card h-[280px] shrink-0 flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 rounded-full bg-jade/10 flex items-center justify-center text-jade">
                  <UsersIcon className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono font-black text-white/70 uppercase tracking-widest">
                    Watching
                  </span>
                  <span className="text-[9px] font-mono text-white/30 uppercase">
                    {room.participants.length} person
                  </span>
                </div>
              </div>
              <UserList
                participants={room.participants}
                myUserId={identity.userId}
                hostId={room.serverState?.hostId}
                isHost={isHost}
                displayNames={room.displayNames}
                tsMap={room.tsMapState}
                leaderTime={leaderTime}
                onKick={(uid) =>
                  sendRef.current?.({ type: "kick", targetUserId: uid })
                }
                onTransferHost={(uid) =>
                  sendRef.current?.({
                    type: "transfer_host",
                    targetUserId: uid,
                  })
                }
              />
            </div>
          </aside>
        )}
      </main>

      {!isFullscreen && !isTheatre && (
        <div className="lg:hidden shrink-0 relative z-20 flex items-center justify-around px-6 py-3 pb-safe backdrop-blur-xl border-t border-white/10 bg-void">
          <MobileTabBtn
            label="Chat"
            active={room.mobileSheet === "chat"}
            icon={<ChatIcon className="w-5 h-5" />}
            onClick={() =>
              room.setMobileSheet(room.mobileSheet === "chat" ? null : "chat")
            }
          />
          <MobileTabBtn
            label={`People (${room.participants.length})`}
            active={room.mobileSheet === "users"}
            icon={<UsersIcon className="w-5 h-5" />}
            onClick={() =>
              room.setMobileSheet(room.mobileSheet === "users" ? null : "users")
            }
          />
        </div>
      )}

      {room.mobileSheet && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => room.setMobileSheet(null)}
          />
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 h-[70vh] flex flex-col bg-surface backdrop-blur-3xl rounded-t-[3rem] border-t border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <span className="font-display font-semibold text-white/90">
                {room.mobileSheet === "chat" ? "Chat" : "Participants"}
              </span>
              <button
                onClick={() => room.setMobileSheet(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full glass-card text-white/40"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {room.mobileSheet === "chat" ? (
                <ChatSidebar
                  messages={room.messages}
                  userId={identity.userId}
                  displayNames={room.displayNames}
                  onSend={(t, d) =>
                    sendRef.current?.({ type: "chat", text: t, dataUrl: d })
                  }
                  typingUsers={room.typingUsers}
                  onTyping={() => sendRef.current?.({ type: "typing" })}
                />
              ) : (
                <UserList
                  participants={room.participants}
                  myUserId={identity.userId}
                  hostId={room.serverState?.hostId}
                  isHost={isHost}
                  displayNames={room.displayNames}
                  tsMap={room.tsMapState}
                  leaderTime={leaderTime}
                  onKick={(uid) =>
                    sendRef.current?.({ type: "kick", targetUserId: uid })
                  }
                  onTransferHost={(uid) =>
                    sendRef.current?.({
                      type: "transfer_host",
                      targetUserId: uid,
                    })
                  }
                />
              )}
            </div>
          </div>
        </>
      )}

      <SettingsPanel
        isOpen={settings.showSettings}
        onClose={() => settings.setShowSettings(false)}
        isHost={isHost}
        hostOnlyControls={room.serverState?.hostOnlyControls}
        strictVideoUrlMode={room.serverState?.strictVideoUrlMode}
        onToggleHostControls={() =>
          sendRef.current?.({ type: "toggle_host_controls" })
        }
        onToggleStrictVideoUrlMode={() =>
          sendRef.current?.({ type: "toggle_strict_video_url_mode" })
        }
        hasPassword={!!room.serverState?.hasPassword}
        onSetPassword={(pw) =>
          sendRef.current?.({ type: "set_password", password: pw })
        }
        {...settings}
      />
      <ShortcutsModal
        isOpen={settings.showShortcuts}
        onClose={() => settings.setShowShortcuts(false)}
      />
      {room.needsPassword && (
        <PasswordModal
          roomId={roomId}
          onSubmit={(pw) => {
            room.setRoomPassword(pw);
            room.setSyncEnabled(true);
            room.setNeedsPassword(false);
          }}
        />
      )}

      {/* [Note] Rule 3.3: Render chat into fullscreen container to avoid iframe occlusion */}
      {isFullscreen &&
        fsChatOpen &&
        typeof document !== "undefined" &&
        document.fullscreenElement &&
        createPortal(
          <div className="fixed top-6 right-6 bottom-24 w-[350px] z-[100] pointer-events-none">
            <div className="w-full h-full glass-card overflow-hidden flex flex-col pointer-events-auto shadow-2xl animate-in slide-in-from-right-8 duration-300">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber/80 animate-pulse" />
                  <span className="text-[10px] font-mono font-black text-white/70 uppercase tracking-widest">
                    FS CHAT
                  </span>
                </div>
                <button
                  onClick={() => setFsChatOpen(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 text-white/20 transition-colors"
                >
                  ✕
                </button>
              </div>
              <ChatSidebar
                messages={room.messages}
                userId={identity.userId}
                displayNames={room.displayNames}
                onSend={(t, d) =>
                  sendRef.current?.({ type: "chat", text: t, dataUrl: d })
                }
                typingUsers={room.typingUsers}
                onTyping={() => sendRef.current?.({ type: "typing" })}
              />
            </div>
          </div>,
          document.fullscreenElement,
        )}
    </div>
  );
}

function CatchUpBanner({ videoTS, onSync, onDismiss }) {
  const h = Math.floor(videoTS / 3600),
    m = Math.floor((videoTS % 3600) / 60),
    s = Math.floor(videoTS % 60);
  const fmt =
    h > 0
      ? `${h}h ${String(m).padStart(2, "0")}m in`
      : m > 0
        ? `${m}m ${String(s).padStart(2, "0")}s in`
        : `${s}s in`;
  return (
    <div className="relative z-40 shrink-0 flex items-center gap-3 px-4 py-2.5 bg-amber/10 border-b border-amber/20 backdrop-blur-sm">
      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      <p className="flex-1 text-sm font-medium text-amber-200/90">
        You joined <span className="font-bold text-amber-400">{fmt}</span> —
        video synced.
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={onSync}
          className="px-3 py-1.5 rounded-[var(--radius-pill)] bg-amber text-void text-[11px] font-black uppercase"
        >
          Sync now
        </button>
        <button
          onClick={onDismiss}
          className="text-amber-400/50 hover:text-amber-400 px-2"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function MobileTabBtn({ label, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-[var(--radius-pill)] transition-all text-[10px] font-bold uppercase tracking-wider ${active ? "text-amber-400 bg-amber/10" : "text-muted hover:text-white/60"}`}
    >
      {icon}
      {label}
    </button>
  );
}

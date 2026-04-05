"use client";

import dynamic from "next/dynamic";
import { useRef, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MessageSquare as ChatIcon,
  Users as UsersIcon,
  Video as VideoIcon,
} from "lucide-react";

import SyncEngine from "@/features/sync/components/SyncEngine";
import VideoPlayer from "@/features/video";
import { getLeaderTime } from "@/lib/syncManager";
import URLBar from "./URLBar";
import ReconnectBanner from "@/components/ReconnectBanner";
import ToastContainer, { useToast } from "@/components/Toast";
import { SplitView } from "./components/SplitView";
import { RoomNavbar } from "./components/RoomNavbar";
import { MobileRoomNav } from "./components/MobileRoomNav";
import { MobileRoomSheets } from "./components/MobileRoomSheets";
import { IncomingCallBanner } from "./components/IncomingCallBanner";

const SettingsPanel = dynamic(() => import("./SettingsPanel"), { ssr: false });
const ShortcutsModal = dynamic(() => import("@/components/ShortcutsModal"), {
  ssr: false,
});
const PasswordModal = dynamic(() => import("@/components/PasswordModal"), {
  ssr: false,
});
const EpisodeSelector = dynamic(
  () => import("@/features/content/EpisodeSelector"),
  { ssr: false },
);
const ChatSidebar = dynamic(() => import("./ChatSidebar"), { ssr: false });
const UserList = dynamic(() => import("./UserList"), { ssr: false });
const CallGrid = dynamic(
  () => import("./components/CallGrid").then((mod) => mod.CallGrid),
  { ssr: false },
);

import useUser from "./hooks/useUser";
import useSettings from "./hooks/useSettings";
import useRoomState from "./hooks/useRoomState";
import useRoomEvents from "./hooks/useRoomEvents";
import useSidebar from "./hooks/useSidebar";
import { useVideoCall } from "./hooks/useVideoCall";
import { useAmbilight } from "./hooks/useAmbilight";
import { useMediaHistory } from "./hooks/useMediaHistory";
import { useVideoState } from "./hooks/useVideoState";
import { ls } from "@/utils/localStorage";

export default function RoomView({ roomId, initialMeta }) {
  const router = useRouter();
  const params = useSearchParams();
  const { toasts, addToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [fsChatOpen, setFsChatOpen] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const sendRef = useRef(null);
  const videoRef = useRef(null);

  const socketRef = useRef(null);
  const typingTimersRef = useRef({});

  const identity = useUser(sendRef);
  const settings = useSettings();
  const room = useRoomState(initialMeta);
  const sidebar = useSidebar();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.target.isContentEditable) return;

      if (e.key === "Escape") {
        if (settings.showSettings) settings.setShowSettings(false);
        if (settings.showShortcuts) settings.setShowShortcuts(false);
        if (room.mobileSheet) room.setMobileSheet(null);
      }

      // T - Toggle theatre mode
      if (
        e.key.toLowerCase() === "t" &&
        !settings.showSettings &&
        !settings.showShortcuts
      ) {
        settings.setTheatreMode(!settings.theatreMode);
      }

      // ? - Show shortcuts
      if (e.key === "?" && !settings.showSettings && !settings.showShortcuts) {
        settings.setShowShortcuts(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [settings, room]);

  const call = useVideoCall({
    roomId,
    userId: identity.userId,
    socketRef,
    addToast,
  });

  const {
    handleChatMessage,
    handleChatUpdate,
    handleUserChange,
    handleKicked,
  } = useRoomEvents({
    userId: identity.userId,
    addToast,
    setParticipants: room.setParticipants,
    setDisplayNames: room.setDisplayNames,
    displayNamesRef: room.displayNamesRef,
    setMessages: room.setMessages,
    setTypingUsers: room.setTypingUsers,
    typingTimers: typingTimersRef,
    setUnreadCount: room.setUnreadCount,
    fsChatOpen,
    mobileSheet: room.mobileSheet,
    showSidebar: settings.showSidebar,
    handleWrongPassword: (isError) => {
      setPasswordError(isError ? "Wrong password" : "");
      room.setNeedsPassword(true);
    },
    router,
  });

  const { rootAmbiRef, bentoVideoRef, handleAmbiColors } =
    useAmbilight(settings);

  const hostToken = mounted ? ls.get(`host_${roomId}`) || "" : "";
  const isHost =
    room.serverState?.hostId === identity.userId ||
    (!!hostToken && !room.serverState?.hostId);

  // [Note] Local file blob: URLs cannot be broadcast to the room (they are tab-local memory objects).
  // We keep them in a separate client-only override so the player can use them without
  // polluting the server state or triggering "Cannot Play Video" for other members on refresh.
  const [localVideoOverride, setLocalVideoOverride] = useState("");

  const videoState = useVideoState({
    videoUrl: room.serverState?.videoUrl || initialMeta?.videoUrl || "",
    params,
    roomId,
    router,
    sendRef,
    isHost,
  });

  // The effective URL seen by the player: local blob overrides server state while it's valid.
  const effectiveVideoUrl = localVideoOverride || videoState.videoUrl;
  useMediaHistory({
    roomId,
    videoUrl: videoState.videoUrl,
    serverState: room.serverState,
    isHost,
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    setMounted(true);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const handleCatchUp = useCallback(() => {
    room.setLateJoinTime(null);
    if (!videoRef.current) return;
    const times = Object.values(room.tsMapState)
      .filter((t) => typeof t === "number")
      .sort((a, b) => a - b);
    if (times.length)
      videoRef.current.currentTime = times[Math.floor(times.length / 2)];
  }, [room.tsMapState]);

  const isTheatre = settings.theatreMode && !isFullscreen;
  const leaderTime = getLeaderTime(room.tsMapState);

  return (
    <div
      className={`h-dvh flex flex-col overflow-hidden font-body antialiased bg-void transition-opacity delay-200 duration-700 ${mounted ? "opacity-100" : "opacity-0"} ${settings.theatreMode ? "theatre-mode" : ""}`}
    >
      <div
        ref={rootAmbiRef}
        aria-hidden
        className="fixed inset-0 pointer-events-none opacity-0 transition-opacity duration-1000"
      />
      {mounted && identity.userId && identity.nameReady && room.syncEnabled && (
        <SyncEngine
          roomId={roomId}
          userId={identity.userId}
          hostToken={hostToken}
          videoUrl={videoState.videoUrl}
          displayName={identity.displayName}
          videoRef={videoRef}
          onStateUpdate={room.handleStateUpdate}
          onChatMessage={handleChatMessage}
          onChatUpdate={handleChatUpdate}
          onUserChange={(e) => {
            handleUserChange(e);
            call.handleSocketEvent(e);
          }}
          participants={room.participants}
          onDriftStatus={room.setSyncStatus}
          onConnStatus={room.setConnStatus}
          onKicked={handleKicked}
          sendRef={sendRef}
          socketRef={socketRef}
          onTsMapUpdate={room.handleTsMapUpdate}
          onLateJoin={room.setLateJoinTime}
          onReconnected={() => {
            addToast("Reconnected", "success");
            if (
              typeof document !== "undefined" &&
              document.pictureInPictureElement
            ) {
              document.exitPictureInPicture().catch(() => {});
            }
          }}
          roomPassword={room.roomPassword}
          speedSyncEnabled={settings.speedSyncEnabled}
          onCallEvent={call.handleSocketEvent}
          addToast={addToast}
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

      <RoomNavbar
        roomId={roomId}
        identity={identity}
        room={room}
        settings={settings}
        router={router}
        videoUrl={videoState.videoUrl}
        addToast={addToast}
        isTheatre={isTheatre}
        isCallJoined={call.isJoined}
        isCalling={call.isCalling}
        onToggleCall={call.isJoined ? call.leaveCall : call.joinCall}
        debugMode={room.debugMode}
        showSidebar={settings.showSidebar}
        onToggleSidebar={() => settings.setShowSidebar(!settings.showSidebar)}
      />

      <SplitView
        showSidebar={settings.showSidebar}
        isFullscreen={isFullscreen}
        isTheatre={isTheatre}
        sidebarWidth={sidebar.sidebarWidth}
        onDragStart={sidebar.onDragStart}
        bentoVideoRef={bentoVideoRef}
        isResizing={sidebar.isResizing}
        containerRef={sidebar.containerRef}
        urlBarContent={
          <URLBar
            onLoad={(u, s) => {
              if (u.startsWith("blob:")) {
                // Local file: play on this client only, do not broadcast to room
                setLocalVideoOverride(u);
              } else {
                // Remote URL: clear any local override and sync to room
                setLocalVideoOverride("");
                sendRef.current?.({
                  type: "change_video",
                  videoUrl: u,
                  subtitleUrl: s,
                });
              }
            }}
            currentUrl={effectiveVideoUrl}
            currentSubtitleUrl={room.serverState?.subtitleUrl || ""}
            isHost={isHost}
            strictVideoUrlMode={room.serverState?.strictVideoUrlMode}
          />
        }
        videoContent={
          <>
            <VideoPlayer
              videoRef={videoRef}
              videoUrl={effectiveVideoUrl}
              subtitleUrl={room.serverState?.subtitleUrl || ""}
              isHost={isHost}
              isRoom={true}
              syncHubEnabled={settings.syncHubEnabled}
              isPlaying={room.serverState?.isPlaying}
              playbackRate={room.serverState?.playbackRate || 1}
              onPlay={(t) =>
                sendRef.current?.({ type: "play", currentTime: t })
              }
              onPause={(t) =>
                sendRef.current?.({ type: "pause", currentTime: t })
              }
              onSeek={(t) =>
                sendRef.current?.({ type: "seek", currentTime: t })
              }
              onSpeed={(r) =>
                sendRef.current?.({
                  type: "speed",
                  rate: r,
                  currentTime: videoRef.current?.currentTime,
                })
              }
              onSubtitleChange={(url) => {
                if (sendRef?.current) {
                  sendRef.current({ type: "set_subtitle", url });
                }
              }}
              onLoad={(videoUrl, subtitleUrl) => {
                if (subtitleUrl && sendRef?.current) {
                  sendRef.current({ type: "set_subtitle", url: subtitleUrl });
                }
              }}
              canControl={!room.serverState?.hostOnlyControls || isHost}
              onAmbiColors={handleAmbiColors}
              theatreMode={settings.theatreMode}
              onToggleTheatre={() =>
                settings.setTheatreMode(!settings.theatreMode)
              }
              hasEpisodes={videoState.isActiveTv}
              onToggleEpisodes={() =>
                videoState.setEpisodesOpen(!videoState.episodesOpen)
              }
              onServerChange={videoState.handleServerChange}
              addToast={addToast}
            />
            {videoState.episodesOpen && videoState.id && (
              <EpisodeSelector
                tmdbId={videoState.id}
                currentSeason={videoState.s}
                currentEpisode={videoState.e}
                onSelectEpisode={videoState.handleSelectEpisode}
                onClose={() => videoState.setEpisodesOpen(false)}
                cache={videoState.seasonCache}
                setCache={videoState.setSeasonCache}
              />
            )}
          </>
        }
        chatContent={
          <>
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 bg-void/20">
              <div className="w-7 h-7 rounded-lg bg-amber/10 flex items-center justify-center text-amber">
                <ChatIcon className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10.5px] font-mono font-black text-white/50 uppercase tracking-[0.2em]">
                  Live Feed
                </span>
                <span className="text-[10px] font-mono text-white/30 uppercase">
                  {room.messages.length} message
                  {room.messages.length !== 1 ? "s" : ""}
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
              onReaction={(ts, emoji) =>
                sendRef.current?.({ type: "reaction", ts, emoji })
              }
              typingUsers={room.typingUsers}
              onTyping={() => sendRef.current?.({ type: "typing" })}
              addToast={addToast}
            />
          </>
        }
        usersContent={
          <>
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 bg-void/20">
              <div className="w-7 h-7 rounded-lg bg-jade/10 flex items-center justify-center text-jade">
                <UsersIcon className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10.5px] font-mono font-black text-white/50 uppercase tracking-[0.2em]">
                  Watching
                </span>
                <span className="text-[10px] font-mono text-white/30 uppercase">
                  {room.participants.length} Participant
                  {room.participants.length !== 1 ? "s" : ""}
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
              inCallUsers={Object.keys(call.remoteStreams)}
              remoteStatus={call.remoteStatus}
              typingUsers={room.typingUsers}
              onKick={(uid) =>
                sendRef.current?.({ type: "kick", targetUserId: uid })
              }
              onTransferHost={(uid) =>
                sendRef.current?.({ type: "transfer_host", targetUserId: uid })
              }
            />
          </>
        }
      />

      <MobileRoomNav
        room={room}
        isTheatre={isTheatre}
        isFullscreen={isFullscreen}
        isCallJoined={call.isJoined}
        isCalling={call.isCalling}
        onToggleCall={call.isJoined ? call.leaveCall : call.joinCall}
        inCallCount={
          Object.keys(call.remoteStreams).length + (call.isJoined ? 1 : 0)
        }
      />
      <MobileRoomSheets
        room={room}
        identity={identity}
        sendRef={sendRef}
        isHost={isHost}
        leaderTime={leaderTime}
        addToast={addToast}
        inCallUsers={Object.keys(call.remoteStreams)}
        remoteStatus={call.remoteStatus}
      />
      {mounted && (
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
          identity={identity}
          {...settings}
        />
      )}
      {mounted && (
        <ShortcutsModal
          isOpen={settings.showShortcuts}
          onClose={() => settings.setShowShortcuts(false)}
        />
      )}
      {room.needsPassword && (
        <PasswordModal
          roomId={roomId}
          error={passwordError}
          onSubmit={(pw) => {
            setPasswordError("");
            room.setRoomPassword(pw);
            room.setSyncEnabled(true);
            room.setNeedsPassword(false);
          }}
        />
      )}

      <CallGrid
        isJoined={call.isJoined}
        isJoining={call.isJoining}
        isCalling={call.isCalling}
        localStream={call.localStream}
        remoteStreams={call.remoteStreams}
        remoteStatus={call.remoteStatus}
        displayNames={room.displayNames}
        onJoin={call.joinCall}
        onLeave={call.leaveCall}
        onToggleMic={call.toggleMic}
        onToggleCam={call.toggleCam}
        micActive={call.micActive}
        camActive={call.camActive}
        mirrorCameraEnabled={settings.mirrorCameraEnabled}
      />

      <IncomingCallBanner
        visible={call.isCalling && !call.isJoined && !call.isJoining}
        callerName={call.activeCallers?.size > 0 ? "Someone" : "Incoming call"}
        onAccept={call.joinCall}
        onDecline={call.leaveCall}
      />

      {mounted &&
        isFullscreen &&
        fsChatOpen &&
        typeof document !== "undefined" &&
        document.fullscreenElement &&
        createPortal(
          <div className="fixed top-6 right-6 bottom-24 w-[350px] z-[100] glass-card overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-right-8 duration-300">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber/80 animate-pulse" />
                <span className="text-[11px] font-mono font-black text-white/40 uppercase tracking-widest">
                  FS CHAT
                </span>
              </div>
              <button
                onClick={() => setFsChatOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 text-white/40 font-mono"
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
              addToast={addToast}
            />
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
      ? `${h}h ${String(m).padStart(2, "0")}m`
      : m > 0
        ? `${m}m ${String(s).padStart(2, "0")}s`
        : `${s}s`;
  return (
    <div className="relative z-40 flex items-center gap-3 px-4 py-2.5 bg-amber/10 border-b border-amber/20 backdrop-blur-sm">
      <div className="w-2 h-2 rounded-full bg-amber animate-pulse" />
      <p className="flex-1 text-sm text-amber-200/90 font-medium">
        You joined {fmt} in — video synced.
      </p>
      <button
        onClick={onSync}
        className="px-3 py-1.5 rounded-full bg-amber text-void text-[11px] font-black uppercase"
      >
        Sync
      </button>
      <button
        onClick={onDismiss}
        className="text-amber/50 hover:text-amber px-2"
      >
        ✕
      </button>
    </div>
  );
}

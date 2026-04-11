"use client";

import dynamic from "next/dynamic";
import { useRef, useCallback, useEffect, useState } from "react";
import { getNextEpisode } from "@/lib/videoResolver";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { MessageSquare as ChatIcon, Users as UsersIcon } from "lucide-react";

import SyncEngine from "@/features/sync/components/SyncEngine";
import VideoPlayer from "@/features/video";
import { getLeaderTime } from "@/lib/syncManager";
import { extractJwtSub } from "@/lib/jwtAuth";
import URLBar from "./components/URLBar";
import ReconnectBanner from "./components/ReconnectBanner";
import ToastContainer, { useToast } from "@/components/Toast";
import AutoNextOverlay from "@/components/AutoNextOverlay";
import { SplitView } from "./components/SplitView";
import { RoomNavbar } from "./components/RoomNavbar";
import { MobileRoomNav } from "./components/MobileRoomNav";
import { MobileRoomSheets } from "./components/MobileRoomSheets";
import { IncomingCallBanner } from "./components/IncomingCallBanner";
import CatchUpBanner from "./components/CatchUpBanner";
import Button from "@/components/ui/Button";

const SettingsPanel = dynamic(() => import("./components/SettingsPanel"), {
  ssr: false,
});
const ShortcutsModal = dynamic(() => import("./components/ShortcutsModal"), {
  ssr: false,
});
const PasswordModal = dynamic(() => import("./components/PasswordModal"), {
  ssr: false,
});
const EpisodeSelector = dynamic(
  () => import("@/features/content/components/EpisodeSelector"),
  { ssr: false },
);
const ChatSidebar = dynamic(() => import("./components/ChatSidebar"), {
  ssr: false,
});
const UserList = dynamic(() => import("./components/UserList"), { ssr: false });
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
import { useUrlSync } from "./hooks/useUrlSync";
import { ls } from "@/utils/localStorage";

export default function RoomView({
  roomId,
  initialMeta,
  initialPreferences,
  initialLocalVideoUrl = "",
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { toasts, addToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [fsChatOpen, setFsChatOpen] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [autoNextUrl, setAutoNextUrl] = useState(null);

  const sendRef = useRef(null);
  const videoRef = useRef(null);

  const socketRef = useRef(null);
  const typingTimersRef = useRef({});

  const identity = useUser(sendRef, initialPreferences);
  const settings = useSettings(initialPreferences);
  const room = useRoomState(initialMeta);
  const sidebar = useSidebar();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.target.isContentEditable) return;

      if (e.key === "Escape") {
        if (settings.showSettings) settings.setShowSettings(false);
        if (settings.showShortcuts) settings.setShowShortcuts(false);
        if (room.mobileSheet) room.setMobileSheet(null);
      }

      if (
        e.key.toLowerCase() === "t" &&
        !settings.showSettings &&
        !settings.showShortcuts
      ) {
        settings.setTheatreMode(!settings.theatreMode);
      }

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
  const tokenSub = extractJwtSub(hostToken);
  const isHost =
    room.serverState?.hostId === identity.userId ||
    (!!hostToken && !room.serverState && tokenSub === identity.userId);

  const [localVideoOverride, setLocalVideoOverride] =
    useState(initialLocalVideoUrl);

  const videoState = useVideoState({
    videoUrl: room.serverState?.videoUrl || initialMeta?.videoUrl || "",
    params,
    roomId,
    router,
    sendRef,
    isHost,
    addToast,
  });

  const effectiveVideoUrl = localVideoOverride || videoState.videoUrl;
  useMediaHistory({
    roomId,
    videoUrl: videoState.videoUrl,
    serverState: room.serverState,
    isHost,
  });

  // URL sync: keep browser address bar in sync with room content
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useUrlSync({
    effectiveVideoUrl,
    videoState,
    pathname,
    searchParams,
    router,
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

  const handlePlay = useCallback(
    (t) => sendRef.current?.({ type: "play", currentTime: t }),
    [],
  );
  const handlePause = useCallback(
    (t) => sendRef.current?.({ type: "pause", currentTime: t }),
    [],
  );
  const handleSeek = useCallback(
    (t) => sendRef.current?.({ type: "seek", currentTime: t }),
    [],
  );
  const handleSpeed = useCallback(
    (r) =>
      sendRef.current?.({
        type: "speed",
        rate: r,
        currentTime: videoRef.current?.currentTime,
      }),
    [],
  );
  const handleSubtitleChange = useCallback((url) => {
    if (sendRef?.current) {
      sendRef.current({ type: "set_subtitle", url });
    }
  }, []);
  const handleLoad = useCallback((videoUrl, subtitleUrl) => {
    if (subtitleUrl && sendRef?.current) {
      sendRef.current({ type: "set_subtitle", url: subtitleUrl });
    }
  }, []);

  const handleVideoEnded = useCallback(() => {
    if (!isHost || !videoState.bingeWatchEnabled) return;

    const nextUrl = getNextEpisode(effectiveVideoUrl);
    if (nextUrl) {
      setAutoNextUrl(nextUrl);
    }
  }, [isHost, effectiveVideoUrl, videoState.bingeWatchEnabled]);

  const handleAutoNextConfirm = useCallback(() => {
    if (!autoNextUrl || !sendRef.current) return;
    sendRef.current({
      type: "change_video",
      videoUrl: autoNextUrl,
      subtitleUrl: "",
    });
    setAutoNextUrl(null);
  }, [autoNextUrl]);

  const handleAutoNextCancel = useCallback(() => {
    setAutoNextUrl(null);
  }, []);

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
              screenshotEnabled={settings.screenshotEnabled}
              onCapture={(dataUrl) => {
                sendRef.current?.({
                  type: "chat",
                  text: "📸 Screenshot",
                  dataUrl,
                });

                addToast("Screenshot sent to chat", "success");
              }}
              isPlaying={room.serverState?.isPlaying}
              playbackRate={room.serverState?.playbackRate || 1}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
              onSpeed={handleSpeed}
              onSubtitleChange={handleSubtitleChange}
              onLoad={handleLoad}
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
              onEnded={handleVideoEnded}
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
                poster={room.meta?.poster || null}
                isRoom
                bingeWatchEnabled={videoState.bingeWatchEnabled}
                onToggleBingeWatch={
                  isHost ? videoState.toggleBingeWatch : undefined
                }
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
          addToast={addToast}
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

      {autoNextUrl && isHost && (
        <AutoNextOverlay
          episodeLabel={`Episode ${Number(videoState.e) + 1}`}
          onConfirm={handleAutoNextConfirm}
          onCancel={handleAutoNextCancel}
        />
      )}

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
              <Button
                variant="custom"
                onClick={() => setFsChatOpen(false)}
                className="!w-7 !h-7 !p-0 !min-h-0 flex items-center justify-center !rounded-full hover:!bg-white/10 !text-white/40 font-mono !border-none !bg-transparent"
              >
                ✕
              </Button>
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
          </div>,
          document.fullscreenElement,
        )}
    </div>
  );
}

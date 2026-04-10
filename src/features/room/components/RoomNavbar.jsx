import React from "react";
import {
  Share2 as ShareIcon,
  Settings as SettingsIcon,
  Keyboard as KeyboardIcon,
  Link as LinkIcon,
  Video as VideoIcon,
  PanelRight as PanelIcon,
} from "lucide-react";

export function RoomNavbar({
  roomId,
  room,
  settings,
  router,
  videoUrl,
  addToast,
  isCallJoined,
  isCalling,
  onToggleCall,
  debugMode = false,
  showSidebar,
  onToggleSidebar,
}) {
  return (
    <nav className="room-navbar relative z-30 shrink-0 px-2 sm:px-4 py-2 flex items-center justify-between gap-1.5 sm:gap-3">
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
        {debugMode && (
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-danger/20 text-danger/80 border border-danger/30 shrink-0">
            DEBUG
          </span>
        )}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 rounded-full glass-card hover:border-white/10 transition-all active:scale-95 shrink-0"
        >
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber flex items-center justify-center font-display font-black text-void text-[10px] sm:text-[11.5px] leading-none">
            AS
          </div>
          <span className="font-display font-bold text-sm sm:text-base tracking-tight text-white/70 hidden md:block">
            Astra Sync
          </span>
        </button>

        <div className="flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-full glass-card text-[9px] sm:text-[11px] font-mono uppercase tracking-[0.1em] sm:tracking-[0.2em] shrink-0">
          <span
            className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full transition-colors duration-500 ${room.connStatus === "connected" ? "bg-jade animate-pulse" : room.connStatus === "reconnecting" ? "bg-danger" : "bg-amber"}`}
          />
          <span className="text-white/70 font-black truncate max-w-[45px] sm:max-w-none">
            {roomId?.slice?.(0, 6) || "ROOM"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <button
          onClick={onToggleCall}
          title="Toggle video call"
          className={`relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full glass-card transition-all shrink-0
            ${isCallJoined ? "text-amber border-amber/30 bg-amber/10 shadow-[0_0_15px_rgba(var(--color-amber-rgb),0.2)]" : isCalling ? "text-amber/70 border-amber/20" : "text-muted hover:text-white"}`}
        >
          <VideoIcon className="w-3.5 h-3.5 sm:w-4 h-4" />
          {isCallJoined ? (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber rounded-full border border-void shadow-[0_0_8px_rgba(var(--color-amber-rgb),0.5)] animate-pulse" />
          ) : isCalling ? (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber/60 rounded-full animate-pulse" />
          ) : null}
        </button>

        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            title={showSidebar ? "Hide sidebar" : "Show sidebar"}
            className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full glass-card transition-all shrink-0 ${
              showSidebar ? "text-amber" : "text-muted hover:text-white"
            }`}
          >
            <PanelIcon className="w-3.5 h-3.5 sm:w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => {
            if (!videoUrl) {
              addToast("No video currently playing", "warning");
              return;
            }
            if (navigator?.clipboard?.writeText) {
              navigator.clipboard.writeText(videoUrl);
              addToast("Video URL copied", "success");
            }
          }}
          title="Copy video URL"
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full glass-card text-muted hover:text-white transition-all shrink-0"
        >
          <LinkIcon className="w-3.5 h-3.5 sm:w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-white/10 mx-0.5 hidden sm:block" />

        <button
          onClick={() => settings.setShowShortcuts(true)}
          title="Keyboard shortcuts"
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full glass-card text-muted hover:text-white transition-all shrink-0"
        >
          <KeyboardIcon className="w-4 h-4" />
        </button>

        <button
          onClick={() => settings.setShowSettings(true)}
          title="Settings"
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full glass-card text-muted hover:text-white shrink-0"
        >
          <SettingsIcon className="w-3.5 h-3.5 sm:w-4 h-4" />
        </button>

        <button
          onClick={() => {
            const url = window.location.href;
            if (navigator?.clipboard?.writeText) {
              navigator.clipboard.writeText(url);
              addToast("Room link copied", "success");
            }
          }}
          title="Copy room link"
          className="h-8 sm:h-9 px-2.5 sm:px-4 rounded-full bg-amber text-void font-black text-[10px] sm:text-[11.5px] uppercase tracking-widest hover:brightness-110 transition-all shadow-lg flex items-center gap-1.5 ring-1 ring-amber/40 shrink-0"
        >
          <ShareIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          <span className="hidden sm:inline">Invite</span>
        </button>
      </div>
    </nav>
  );
}

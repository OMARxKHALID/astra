import React from "react";
import {
  Share2 as ShareIcon,
  Settings as SettingsIcon,
  Keyboard as KeyboardIcon,
  Pencil as PencilIcon,
  PanelRight as SidebarIcon,
  Monitor as TheatreIcon,
  Link as LinkIcon,
} from "lucide-react";
import SyncStatusIndicator from "@/components/SyncStatusIndicator";

export function RoomNavbar({
  roomId,
  identity,
  room,
  settings,
  router,
  videoUrl,
  addToast,
  isTheatre,
}) {
  return (
    <nav className="room-navbar relative z-30 shrink-0 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-pill)] glass-card hover:border-white/10 transition-all active:scale-95 shrink-0"
        >
          <div className="w-7 h-7 rounded-[var(--radius-pill)] bg-amber flex items-center justify-center font-display font-black text-void text-[11.5px]">
            AS
          </div>
          <span className="font-display font-bold text-base tracking-tight text-white/70 hidden md:block">
            Astra Sync
          </span>
        </button>

        <div className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-pill)] glass-card text-[11px] font-mono uppercase tracking-[0.2em] shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${room.connStatus === "connected" ? "bg-jade animate-pulse" : room.connStatus === "reconnecting" ? "bg-danger" : "bg-amber"}`}
          />
          <span className="text-white/70 font-black hidden xs:inline">
            {roomId?.slice?.(0, 6)}
          </span>
          <span className="text-white/70 font-black xs:hidden">
            {roomId?.slice?.(0, 6)}
          </span>
        </div>

        {identity.nameReady ? (
          identity.editingName ? (
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
                className="w-28 bg-transparent text-[13px] font-mono text-white/40 outline-none"
              />
            </form>
          ) : (
            <button
              onClick={() => {
                identity.setNameInput(identity.displayName);
                identity.setEditingName(true);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-pill)] glass-card hover:border-white/10 transition-all text-[11px] font-mono text-white/40 hover:text-white/40 max-w-[140px] min-w-0"
            >
              <PencilIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{identity.displayName}</span>
            </button>
          )
        ) : (
          /* [Note] Navbar skeleton: ensures space is reserved for user identity */
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-[var(--radius-pill)] glass-card opacity-20 animate-pulse w-24">
            <div className="w-3.5 h-3.5 bg-white/20 rounded-full" />
            <div className="h-2 w-12 bg-white/20 rounded-full" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => {
            const next = !settings.showSidebar;
            settings.setShowSidebar(next);
            if (next) room.setUnreadCount(0);
          }}
          className={`relative w-9 h-9 items-center justify-center rounded-[var(--radius-pill)] glass-card transition-all hidden lg:flex ${settings.showSidebar ? "text-amber bg-amber/5" : "text-muted hover:text-white"}`}
        >
          <SidebarIcon className="w-4 h-4" />
          {!settings.showSidebar && room.unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber rounded-full shadow-[0_0_8px_rgba(var(--color-amber-rgb), 0.5)]" />
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
          className={`w-9 h-9 items-center justify-center rounded-[var(--radius-pill)] glass-card transition-all hidden lg:flex ${isTheatre ? "text-amber bg-amber/5" : "text-muted hover:text-white"}`}
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
          className="h-9 sm:h-10 px-3 sm:px-4 rounded-[var(--radius-pill)] bg-amber text-void font-black text-[11.5px] sm:text-[12.5px] uppercase tracking-widest hover:bg-amber active:scale-95 transition-all shadow-lg flex items-center gap-1.5 ring-1 ring-amber/60"
        >
          <ShareIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Invite</span>
        </button>
      </div>
    </nav>
  );
}

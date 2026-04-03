import React from "react";
import { MessageSquare as ChatIcon, Users as UsersIcon, Video as VideoIcon } from "lucide-react";

export function MobileRoomNav({ room, isTheatre, isFullscreen, isCallJoined, isCalling, onToggleCall, inCallCount = 0 }) {
  if (isFullscreen || isTheatre) return null;

  return (
    <div className="lg:hidden shrink-0 relative z-20 flex items-center justify-around px-6 py-3 pb-safe backdrop-blur-xl border-t border-white/10 bg-void">
      <MobileTabBtn
        label={isCallJoined ? "Active" : "Join Call"}
        active={isCallJoined}
        icon={
          <div className="relative">
             <VideoIcon className={`w-5 h-5 ${isCallJoined || isCalling ? "text-amber" : ""}`} />
             {isCallJoined ? (
               <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber rounded-full animate-pulse border border-void" />
             ) : isCalling ? (
               <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber/60 rounded-full animate-pulse" />
             ) : null}
          </div>
        }
        onClick={onToggleCall}
      />
      <MobileTabBtn
        label="Chat"
        active={room.mobileSheet === "chat"}
        icon={
          <div className="relative">
            <ChatIcon className="w-5 h-5" />
            {room.unreadCount > 0 && room.mobileSheet !== "chat" && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber rounded-full border-2 border-void shadow-[0_0_8px_rgba(var(--color-amber-rgb),0.5)]" />
            )}
          </div>
        }
        onClick={() => {
          room.setMobileSheet(room.mobileSheet === "chat" ? null : "chat");
          room.setUnreadCount(0);
        }}
      />
      <MobileTabBtn
        label={`People${inCallCount > 0 ? ` (${inCallCount}🎥)` : ""}`}
        active={room.mobileSheet === "users"}
        icon={
          <div className="relative">
            <UsersIcon className="w-5 h-5" />
            {inCallCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-jade rounded-full border-2 border-void" />
            )}
          </div>
        }
        onClick={() =>
          room.setMobileSheet(room.mobileSheet === "users" ? null : "users")
        }
      />
    </div>
  );
}

function MobileTabBtn({ label, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-[var(--radius-pill)] transition-all text-[10px] font-bold uppercase tracking-wider ${active ? "text-amber bg-amber/10" : "text-muted hover:text-white/40"}`}
    >
      {icon}
      {label}
    </button>
  );
}

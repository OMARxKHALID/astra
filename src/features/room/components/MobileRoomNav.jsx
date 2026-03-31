import React from "react";
import { MessageSquare as ChatIcon, Users as UsersIcon } from "lucide-react";

export function MobileRoomNav({ room, isTheatre, isFullscreen }) {
  if (isFullscreen || isTheatre) return null;

  return (
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

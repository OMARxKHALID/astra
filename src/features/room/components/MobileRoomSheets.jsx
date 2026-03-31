import React from "react";
import ChatSidebar from "../ChatSidebar";
import UserList from "../UserList";

export function MobileRoomSheets({
  room,
  identity,
  sendRef,
  isHost,
  leaderTime,
}) {
  if (!room.mobileSheet) return null;

  return (
    <>
      <div
        className="lg:hidden fixed inset-0 z-40 bg-void/60 backdrop-blur-sm"
        onClick={() => room.setMobileSheet(null)}
      />
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 h-[70vh] flex flex-col glass-card !rounded-t-[var(--radius-sheet)] border-t border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <span className="font-display font-semibold text-white/40">
            {room.mobileSheet === "chat" ? "Chat" : "Participants"}
          </span>
          <button
            onClick={() => room.setMobileSheet(null)}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-pill)] glass-card text-white/40"
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
  );
}

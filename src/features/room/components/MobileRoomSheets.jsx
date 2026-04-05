import React, { useRef, useState, useEffect } from "react";
import ChatSidebar from "./ChatSidebar";
import UserList from "./UserList";

export function MobileRoomSheets({
  room,
  identity,
  sendRef,
  isHost,
  leaderTime,
  addToast,
  inCallUsers = [],
  remoteStatus = {},
}) {
  const [dragY, setDragY] = useState(0);
  const dragStartRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      const visualHeight = window.visualHeight || window.innerHeight;
      const diff = window.innerHeight - visualHeight;
      setKeyboardHeight(diff > 0 ? diff : 0);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("visualviewport", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("visualviewport", handleResize);
    };
  }, []);

  const handleDragStart = (e) => {
    dragStartRef.current = e.touches[0].clientY;
    setDragY(0);
  };

  const handleDragMove = (e) => {
    if (dragStartRef.current === null) return;
    const delta = e.touches[0].clientY - dragStartRef.current;
    if (delta > 0) setDragY(delta);
  };

  const handleDragEnd = () => {
    if (dragY > 80) {
      room.setMobileSheet(null);
    }
    setDragY(0);
    dragStartRef.current = null;
  };

  if (!room.mobileSheet) return null;

  const sheetHeight = keyboardHeight > 0 
    ? `calc(100dvh - ${keyboardHeight}px)` 
    : "h-[75dvh]";

  return (
    <>
      <div
        className="lg:hidden fixed inset-0 z-40 bg-void/60 backdrop-blur-sm"
        onClick={() => room.setMobileSheet(null)}
      />
      <div
        className={`lg:hidden fixed bottom-0 inset-x-0 z-50 ${sheetHeight} flex flex-col glass-card border-t border-border overflow-hidden shadow-[0_-20px_60px_rgba(0,0,0,0.4)]`}
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragY === 0 ? "transform 0.3s cubic-bezier(0.23,1,0.32,1)" : "none",
        }}
      >
        <div
          className="flex flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none shrink-0"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-b border-border/40 shrink-0">
          <span className="font-display font-bold text-sm text-white/60 uppercase tracking-widest">
            {room.mobileSheet === "chat" ? "Room Chat" : "Participants"}
          </span>
          <button
            onClick={() => room.setMobileSheet(null)}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-pill)] glass-card text-white/40 touch-manipulation"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-hidden min-h-0">
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
              addToast={addToast}
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
              inCallUsers={inCallUsers}
              remoteStatus={remoteStatus}
              typingUsers={room.typingUsers}
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

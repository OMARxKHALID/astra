"use client";

import { useCallback, useRef } from "react";
import { MAX_CHAT_MESSAGES } from "@/constants/config";
import { SYSTEM_ICONS } from "../roomMaps";

export default function useRoomEvents({
  userId,
  addToast,
  setParticipants,
  setDisplayNames,
  displayNamesRef,
  setMessages,
  setTypingUsers,
  typingTimers,
  setUnreadCount,
  fsChatOpen,
  mobileSheet,
  showSidebar,
  handleWrongPassword,
  router,
}) {
  // [Note] Ref mirror: avoids stale closures in handleChatMessage without re-creating the callback
  const visRef = useRef({ fsChatOpen, mobileSheet, showSidebar });
  visRef.current = { fsChatOpen, mobileSheet, showSidebar };

  const handleChatMessage = useCallback(
    (msg) => {
      if (msg.type === "chat_history") {
        setMessages(msg.messages || []);
        return;
      }
      if (!msg.text && !msg.dataUrl && msg.senderId !== "system") return;

      if (msg.senderId === "system") {
        let text = msg.text || "",
          type = "info",
          icon = null;
        for (const [tag, { color, Icon, toastType }] of Object.entries(
          SYSTEM_ICONS,
        )) {
          if (text.includes(tag)) {
            text = text.replace(tag, "").trim();
            type = toastType || "info";
            icon = <Icon className={`w-4 h-4 ${color}`} />;
            break;
          }
        }
        addToast(text, type, 4000, icon);
        return;
      }

      // [Note] Dedupe: prevents duplicate messages on socket reconnection replays
      setMessages((prev) => {
        if (msg.ts && prev.some((m) => m.ts === msg.ts && m.senderId === msg.senderId)) return prev;
        return [...prev, msg].slice(-MAX_CHAT_MESSAGES);
      });
      const { fsChatOpen: fsOpen, mobileSheet: sheet, showSidebar: sidebar } = visRef.current;
      const isMobile =
        typeof window !== "undefined" && window.innerWidth < 1024;
      const isVisible = document.fullscreenElement
        ? fsOpen
        : isMobile
          ? sheet === "chat"
          : sidebar;
      if (!isVisible) setUnreadCount((n) => n + 1);
    },
    [addToast, setMessages, setUnreadCount],
  );

  const handleUserChange = useCallback(
    (event) => {
      if (!event) return;
      switch (event.type) {
        case "reset":
          setParticipants([]);
          setDisplayNames({});
          break;
        case "participants":
          setParticipants((event.users || []).map((u) => u.userId));
          setDisplayNames((prev) => {
            const n = { ...prev };
            (event.users || []).forEach((u) => {
              n[u.userId] = u.username;
            });
            return n;
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
            if (event.userId !== userId)
              addToast(`${event.username} joined!`, "info");
          }
          break;
        case "user_left": {
          const name = displayNamesRef.current[event.userId] || "Someone";
          setParticipants((prev) => prev.filter((id) => id !== event.userId));
          addToast(`${name} left.`, "info");
          break;
        }
        case "name_changed":
          setDisplayNames((prev) => ({
            ...prev,
            [event.userId]: event.username,
          }));
          break;
        case "user_typing":
          setTypingUsers((prev) => ({
            ...prev,
            [event.userId]: { username: event.username, ts: Date.now() },
          }));
          clearTimeout(typingTimers.current[event.userId]);
          typingTimers.current[event.userId] = setTimeout(() => {
            setTypingUsers((prev) => {
              const n = { ...prev };
              delete n[event.userId];
              return n;
            });
          }, 3500);
          break;
      }
    },
    [
      userId,
      addToast,
      setParticipants,
      setDisplayNames,
      displayNamesRef,
      setTypingUsers,
      typingTimers,
    ],
  );

  const handleKicked = useCallback(
    (reason) => {
      if (reason === "WRONG_PASSWORD") {
        handleWrongPassword();
        return;
      }
      router.push("/?kicked=1");
    },
    [router, handleWrongPassword],
  );

  return {
    handleChatMessage,
    handleUserChange,
    handleKicked,
  };
}

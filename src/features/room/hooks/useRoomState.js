"use client";

import { useState, useCallback, useRef } from "react";

export default function useRoomState(initialMeta) {
  const [serverState, setServerState] = useState(
    initialMeta?.videoUrl
      ? {
          videoUrl: initialMeta.videoUrl,
          hasPassword: initialMeta.hasPassword ?? false,
          isPlaying: false,
          currentTime: 0,
          playbackRate: 1,
          isHostHint: initialMeta.isHostHint,
          hostId: initialMeta.hostId || "",
        }
      : null,
  );
  const [syncStatus, setSyncStatus] = useState("synced");
  const [connStatus, setConnStatus] = useState("connecting");
  const [participants, setParticipants] = useState([]);
  const [displayNames, setDisplayNames] = useState({});
  const [messages, setMessages] = useState([]);
  const [tsMapState, setTsMapState] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [lateJoinTime, setLateJoinTime] = useState(null);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [roomPassword, setRoomPassword] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileSheet, setMobileSheet] = useState(null);
  const [debugMode, setDebugMode] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("debug") === "1";
    }
    return false;
  });

  const displayNamesRef = useRef(displayNames);
  displayNamesRef.current = displayNames;

  const handleStateUpdate = useCallback((stOrFn) => setServerState(stOrFn), []);
  const handleTsMapUpdate = useCallback((data) => setTsMapState({ ...data }), []);
  
  return {
    serverState,
    setServerState,
    syncStatus,
    setSyncStatus,
    syncEnabled,
    setSyncEnabled,
    needsPassword,
    setNeedsPassword,
    roomPassword,
    setRoomPassword,
    connStatus,
    setConnStatus,
    participants,
    setParticipants,
    displayNames,
    setDisplayNames,
    displayNamesRef,
    messages,
    setMessages,
    tsMapState,
    setTsMapState,
    typingUsers,
    setTypingUsers,
    lateJoinTime,
    setLateJoinTime,
    unreadCount,
    setUnreadCount,
    mobileSheet,
    setMobileSheet,
    debugMode,
    setDebugMode,
    handleStateUpdate,
    handleTsMapUpdate,
  };
}

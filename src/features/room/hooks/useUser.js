"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

import { LS_KEYS } from "@/constants/config";
import { ls } from "@/utils/localStorage";

export default function useUser(sendRef) {
  const { data: session } = useSession();
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [nameReady, setNameReady] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    // [Note] Identity unification: Prioritize session user ID over local storage
    if (session?.user?.id) {
      setUserId(session.user.id);
      return;
    }

    const key = LS_KEYS.userId;
    const stored = ls.get(key) || sessionStorage.getItem(key);
    if (stored) {
      ls.set(key, stored);
      setUserId(stored);
      return;
    }
    const id = 
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `guest-${Math.random().toString(36).slice(2, 11)}-${Date.now().toString(36)}`;
    ls.set(key, id);
    setUserId(id);
  }, [session?.user?.id]);

  useEffect(() => {
    const stored = ls.get(LS_KEYS.displayName);
    const sessionName = session?.user?.name;
    const name =
      sessionName || 
      stored || 
      `Guest-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    
    if (!stored && !sessionName) ls.set(LS_KEYS.displayName, name);
    setDisplayName(name);
    setNameReady(true);
    setNameInput(name);
  }, [session?.user?.name]);

  const commitName = useCallback(
    (raw) => {
      const name = raw.trim().slice(0, 24);
      if (!name) return;
      setDisplayName(name);
      ls.set(LS_KEYS.displayName, name);
      sendRef?.current?.({ type: "set_name", username: name });
      setEditingName(false);
    },
    [sendRef],
  );

  return {
    userId,
    displayName,
    nameReady,
    editingName,
    setEditingName,
    nameInput,
    setNameInput,
    commitName,
  };
}

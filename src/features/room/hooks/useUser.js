"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

import { LS_KEYS } from "@/constants/config";
import { ls } from "@/utils/localStorage";
import { generateId, generateGuestId } from "@/utils/id";

export default function useUser(sendRef) {
  const { data: session, status } = useSession();
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [nameReady, setNameReady] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    // [Note] Identity Lock: Wait for session status to resolve to avoid temporary identity flips
    if (status === "loading") return;

    if (session?.user?.id) {
      ls.set(LS_KEYS.userId, session.user.id);
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
    const id = generateGuestId();
    ls.set(key, id);
    setUserId(id);
  }, [session?.user?.id, status]);

  useEffect(() => {
    if (status === "loading") return;

    const stored = ls.get(LS_KEYS.displayName);
    const sessionName = session?.user?.name;
    let name = stored;

    if (sessionName) {
      if (!stored || stored.startsWith("Guest-")) {
        name = sessionName;
        ls.set(LS_KEYS.displayName, name);
      }
    } else {
      if (!stored) {
        name = `Guest-${generateId(4).toUpperCase()}`;
        ls.set(LS_KEYS.displayName, name);
      }
    }
    setDisplayName(name);
    setNameReady(true);
    setNameInput(name);
  }, [session?.user?.name, status]);

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

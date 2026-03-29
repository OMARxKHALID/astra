"use client";

import { useState, useEffect, useCallback } from "react";

import { LS_KEYS } from "@/constants/config";
import { ls } from "@/utils/localStorage";

export default function useUser(sendRef) {
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [nameReady, setNameReady] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    const key = LS_KEYS.userId;
    const stored = ls.get(key) || sessionStorage.getItem(key);
    if (stored) {
      ls.set(key, stored);
      setUserId(stored);
      return;
    }
    const id = crypto.randomUUID();
    ls.set(key, id);
    setUserId(id);
  }, []);

  useEffect(() => {
    const stored = ls.get(LS_KEYS.displayName);
    const name =
      stored || `Guest-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    if (!stored) ls.set(LS_KEYS.displayName, name);
    setDisplayName(name);
    setNameReady(true);
    setNameInput(name);
  }, []);

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

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

import { LS_KEYS } from "@/constants/config";
import { localStorage } from "@/utils/localStorage";
import { id } from "@/utils/id";
import { setPreference } from "@/app/actions";

export function useUser(sendRef, initialPreferences = {}) {
  const { data: session, status } = useSession();
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState(initialPreferences.guestName || "");
  const [nameReady, setNameReady] = useState(!!initialPreferences.guestName);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(initialPreferences.guestName || "");

  useEffect(() => {
    // [Note] Identity Lock: Wait for session status to resolve to avoid temporary identity flips
    if (status === "loading") return;

    if (session?.user?.id) {
      localStorage.set(LS_KEYS.userId, session.user.id);
      setUserId(session.user.id);
      return;
    }

    const key = LS_KEYS.userId;
    const stored = localStorage.get(key) || sessionStorage.getItem(key);
    if (stored) {
      localStorage.set(key, stored);
      setUserId(stored);
      return;
    }
    const newId = id.generateGuest();
    localStorage.set(key, newId);
    setUserId(newId);
  }, [session?.user?.id, status]);

  useEffect(() => {
    if (status === "loading") return;

    const stored = localStorage.get(LS_KEYS.displayName);
    const sessionName = session?.user?.name;
    let name = stored;

    if (sessionName) {
      if (!stored || stored.startsWith("Guest-")) {
        name = sessionName;
        localStorage.set(LS_KEYS.displayName, name);
      }
    } else {
      if (!stored) {
        name = `Guest-${id.generate(4).toUpperCase()}`;
        localStorage.set(LS_KEYS.displayName, name);
      }
    }
    setDisplayName(name);
    setNameReady(true);
    setNameInput(name);
    
    // [Note] Identity Persistence: Sync to cookie for SSR-safe initial load
    if (name) {
      setPreference("astra_guest_name", name);
    }
  }, [session?.user?.name, status]);

  const commitName = useCallback(
    (raw) => {
      const name = raw.trim().slice(0, 24);
      if (!name) return;
      setDisplayName(name);
      localStorage.set(LS_KEYS.displayName, name);
      setPreference("astra_guest_name", name);
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

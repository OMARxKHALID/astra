"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { LS_KEYS } from "@/constants/config";
import { localStorage } from "@/utils/localStorage";
import { setPreference } from "@/app/actions";

export function useSettings(initialPreferences = {}) {
  const [screenshotEnabled, setScreenshotEnabled] = useState(true);
  const [hlsQualityEnabled, setHlsQualityEnabled] = useState(true);
  const [scrubPreviewEnabled, setScrubPreviewEnabled] = useState(true);
  const [speedSyncEnabled, setSpeedSyncEnabled] = useState(true);
  const [ambilightEnabled, setAmbilightEnabled] = useState(initialPreferences.ambilight ?? true);
  const [mirrorCameraEnabled, setMirrorCameraEnabled] = useState(true);
  const [syncHubEnabled, setSyncHubEnabled] = useState(false);
  const [theatreMode, setTheatreMode] = useState(initialPreferences.theatreMode ?? false);
  const [showSidebar, setShowSidebar] = useState(initialPreferences.sidebarOpen ?? true);
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const settingsLoadedRef = useRef(false);

  useEffect(() => {
    setScreenshotEnabled(localStorage.get(LS_KEYS.screenshot) !== "false");
    setHlsQualityEnabled(localStorage.get(LS_KEYS.hlsQuality) !== "false");
    setScrubPreviewEnabled(localStorage.get(LS_KEYS.scrubPreview) !== "false");
    setAmbilightEnabled(localStorage.get(LS_KEYS.ambilight) !== "false");
    setSpeedSyncEnabled(localStorage.get(LS_KEYS.speedSync) !== "false");
    setMirrorCameraEnabled(localStorage.get(LS_KEYS.mirrorCamera) !== "false");
    setSyncHubEnabled(localStorage.get(LS_KEYS.syncHub) === "true");
    setTheatreMode(localStorage.get(LS_KEYS.theatreMode) === "true");
    setShowSidebar(localStorage.get(LS_KEYS.sidebarOpen) !== "false");
    settingsLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!settingsLoadedRef.current) return;
    localStorage.set(LS_KEYS.screenshot, screenshotEnabled ? "true" : "false");
    localStorage.set(LS_KEYS.hlsQuality, hlsQualityEnabled ? "true" : "false");
    localStorage.set(LS_KEYS.scrubPreview, scrubPreviewEnabled ? "true" : "false");
    localStorage.set(LS_KEYS.ambilight, ambilightEnabled ? "true" : "false");
    localStorage.set(LS_KEYS.speedSync, speedSyncEnabled ? "true" : "false");
    localStorage.set(LS_KEYS.mirrorCamera, mirrorCameraEnabled ? "true" : "false");
    localStorage.set(LS_KEYS.syncHub, syncHubEnabled ? "true" : "false");
    localStorage.set(LS_KEYS.theatreMode, theatreMode ? "true" : "false");
    localStorage.set(LS_KEYS.sidebarOpen, showSidebar ? "true" : "false");

    // [Note] Client Cookie Pattern: Sync to cookies via Server Action for SSR-safe initial state
    setPreference("astra_theatre_mode", theatreMode ? "true" : "false");
    setPreference("astra_sidebar_open", showSidebar ? "true" : "false");
    setPreference("astra_ambilight", ambilightEnabled ? "true" : "false");
  }, [
    screenshotEnabled,
    hlsQualityEnabled,
    scrubPreviewEnabled,
    ambilightEnabled,
    speedSyncEnabled,
    mirrorCameraEnabled,
    syncHubEnabled,
    theatreMode,
    showSidebar,
  ]);

  return useMemo(
    () => ({
      screenshotEnabled,
      setScreenshotEnabled,
      hlsQualityEnabled,
      setHlsQualityEnabled,
      scrubPreviewEnabled,
      setScrubPreviewEnabled,
      speedSyncEnabled,
      setSpeedSyncEnabled,
      ambilightEnabled,
      setAmbilightEnabled,
      mirrorCameraEnabled,
      setMirrorCameraEnabled,
      syncHubEnabled,
      setSyncHubEnabled,
      theatreMode,
      setTheatreMode,
      showSidebar,
      setShowSidebar,
      showSettings,
      setShowSettings,
      showShortcuts,
      setShowShortcuts,
    }),
    [
      screenshotEnabled,
      hlsQualityEnabled,
      scrubPreviewEnabled,
      speedSyncEnabled,
      ambilightEnabled,
      mirrorCameraEnabled,
      syncHubEnabled,
      theatreMode,
      showSidebar,
      showSettings,
      showShortcuts,
    ],
  );
}

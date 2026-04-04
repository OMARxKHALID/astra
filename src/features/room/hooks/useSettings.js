"use client";

import { useState, useEffect, useRef } from "react";
import { LS_KEYS } from "@/constants/config";
import { ls } from "@/utils/localStorage";

export default function useSettings() {
  const [screenshotEnabled, setScreenshotEnabled] = useState(true);
  const [hlsQualityEnabled, setHlsQualityEnabled] = useState(true);
  const [scrubPreviewEnabled, setScrubPreviewEnabled] = useState(true);
  const [speedSyncEnabled, setSpeedSyncEnabled] = useState(true);
  const [ambilightEnabled, setAmbilightEnabled] = useState(true);
  const [mirrorCameraEnabled, setMirrorCameraEnabled] = useState(true);
  const [theatreMode, setTheatreMode] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const settingsLoadedRef = useRef(false);

  useEffect(() => {
    setScreenshotEnabled(ls.get(LS_KEYS.screenshot) !== "false");
    setHlsQualityEnabled(ls.get(LS_KEYS.hlsQuality) !== "false");
    setScrubPreviewEnabled(ls.get(LS_KEYS.scrubPreview) !== "false");
    setAmbilightEnabled(ls.get(LS_KEYS.ambilight) !== "false");
    setSpeedSyncEnabled(ls.get(LS_KEYS.speedSync) !== "false");
    setMirrorCameraEnabled(ls.get(LS_KEYS.mirrorCamera) !== "false");
    setTheatreMode(ls.get(LS_KEYS.theatreMode) === "true");
    setShowSidebar(ls.get(LS_KEYS.sidebarOpen) !== "false");
    settingsLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!settingsLoadedRef.current) return;
    ls.set(LS_KEYS.screenshot, screenshotEnabled ? "true" : "false");
    ls.set(LS_KEYS.hlsQuality, hlsQualityEnabled ? "true" : "false");
    ls.set(LS_KEYS.scrubPreview, scrubPreviewEnabled ? "true" : "false");
    ls.set(LS_KEYS.ambilight, ambilightEnabled ? "true" : "false");
    ls.set(LS_KEYS.speedSync, speedSyncEnabled ? "true" : "false");
    ls.set(LS_KEYS.mirrorCamera, mirrorCameraEnabled ? "true" : "false");
    ls.set(LS_KEYS.theatreMode, theatreMode ? "true" : "false");
    ls.set(LS_KEYS.sidebarOpen, showSidebar ? "true" : "false");
  }, [
    screenshotEnabled,
    hlsQualityEnabled,
    scrubPreviewEnabled,
    ambilightEnabled,
    speedSyncEnabled,
    mirrorCameraEnabled,
    theatreMode,
    showSidebar,
  ]);

  return {
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
    theatreMode,
    setTheatreMode,
    showSidebar,
    setShowSidebar,
    showSettings,
    setShowSettings,
    showShortcuts,
    setShowShortcuts,
  };
}

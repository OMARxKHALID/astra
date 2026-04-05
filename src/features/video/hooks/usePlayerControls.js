import { useState, useRef, useCallback, useEffect } from "react";

export function usePlayerControls(timeout = 3000) {
  const [ctrlVis, setCtrlVis] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideTimer = useRef(null);

  const showCtrl = useCallback(() => {
    setCtrlVis(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setCtrlVis(false), timeout);
  }, [timeout]);

  useEffect(() => {
    const onFS = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFS);
    return () => document.removeEventListener("fullscreenchange", onFS);
  }, []);

  useEffect(() => {
    return () => clearTimeout(hideTimer.current);
  }, []);

  return { ctrlVis, setCtrlVis, showCtrl, isFullscreen, setIsFullscreen };
}

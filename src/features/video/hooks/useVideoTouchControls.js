import { useRef, useCallback } from "react";

const TAP_DELAY = 300; // ms between taps for double-tap detection

export function useVideoTouchControls({
  videoRef,
  canControl = true,
  handlePlayPause,
  handleFullscreen,
  onSeek,
  showCtrl,
  handleVolumeOsd,
}) {
  const lastTapRef = useRef(0);
  const isTouchRef = useRef(false);

  const executeDoubleTapAction = useCallback(
    (clientX, rect) => {
      const v = videoRef?.current;
      if (!v || !canControl) {
        handleFullscreen?.();
        return;
      }

      const x = clientX - rect.left;
      const width = rect.width;

      if (x < width * 0.3) {
        const time = v.currentTime ?? 0;
        const t = Math.max(0, time - 10);
        try {
          v.currentTime = t;
        } catch (e) {}
        onSeek?.(t);
        handleVolumeOsd?.("rewind");
      } else if (x > width * 0.7) {
        const time = v.currentTime ?? 0;
        const dur = v.duration || Infinity;
        const t = Math.min(dur, time + 10);
        try {
          v.currentTime = t;
        } catch (e) {}
        onSeek?.(t);
        handleVolumeOsd?.("forward");
      } else {
        handleFullscreen?.();
      }
    },
    [canControl, videoRef, onSeek, handleFullscreen, handleVolumeOsd],
  );

  const handleTouchEnd = useCallback(
    (e) => {
      if (isTouchRef.current) {
         clearTimeout(isTouchRef.current);
      }
      // Reset touch guard after 500ms
      isTouchRef.current = setTimeout(() => {
        isTouchRef.current = null;
      }, 500);

      // Prevent accidental zoom/scrolling while interacting with the player surface
      if (e.cancelable) e.preventDefault();
      showCtrl?.();

      const now = Date.now();
      const since = now - lastTapRef.current;
      lastTapRef.current = now;

      // Safely extract coordinates from either PointerEvent or legacy TouchEvent
      const clientX =
        e.clientX || (e.changedTouches ? e.changedTouches[0].clientX : 0);
      const rect = e.currentTarget.getBoundingClientRect();
      const xPct = (clientX - rect.left) / rect.width;
      const isSide = xPct < 0.3 || xPct > 0.7;

      if (since < TAP_DELAY && since > 0) {
        lastTapRef.current = 0;
        if (isSide) {
          executeDoubleTapAction(clientX, rect);
        } else {
          // If a second tap happens in the center, we toggle play again (reverting the first tap)
          // and enter fullscreen, mimicking native behavior.
          handlePlayPause?.();
          handleFullscreen?.();
        }
      } else {
        // Single tap in the center toggles playback immediately
        if (!isSide) {
          handlePlayPause?.();
        }
      }
    },
    [showCtrl, executeDoubleTapAction, handlePlayPause, handleFullscreen],
  );

  const handlePointerUp = useCallback(
    (e) => {
      // Use Pointer events for unified mouse/touch handling
      if (e.pointerType === "touch") {
        handleTouchEnd(e);
      } else {
        handlePlayPause?.();
      }
    },
    [handleTouchEnd, handlePlayPause],
  );

  const handleDoubleClick = useCallback(
    (e) => {
      if (isTouchRef.current) return; // Prevent double-firing from browser-synthesized dblclick on mobile
      // For pure mouse interactions (desktop), double-clicking anywhere should toggle fullscreen,
      // mimicking native YouTube desktop behavior. Touch gestures are fully handled above.
      handleFullscreen?.();
    },
    [handleFullscreen],
  );

  return { handlePointerUp, handleDoubleClick, handleTouchEnd };
}

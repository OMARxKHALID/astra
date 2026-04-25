"use client";

import { useCallback, useRef } from "react";
import { DEBUG } from "@/constants/config";

const logError = DEBUG ? console.error : () => {};

export function useSounds() {
  const audioCtxRef = useRef(null);

  const initCtx = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  };

  const playPing = useCallback(() => {
    try {
      initCtx();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // High A
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1); // Slide to Mid A

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (err) {
      logError(`[sounds] Failed to play ping:`, err);
    }
  }, []);

  return { playPing };
}

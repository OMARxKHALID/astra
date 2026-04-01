"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { LS_KEYS } from "@/constants/config";
import { ls } from "@/utils/localStorage";

const MIN_WIDTH = 250;
const MAX_WIDTH = 600;

export default function useSidebar() {
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);

  const dragStartX = useRef(0);
  const dragStartW = useRef(0);
  const isDragging = useRef(false);

  const rafId = useRef(null);
  const latestX = useRef(0);

  // Load saved width
  useEffect(() => {
    const saved = ls.get(LS_KEYS.sidebarWidth);
    if (saved) setSidebarWidth(parseInt(saved, 10));
  }, []);

  // Persist width
  useEffect(() => {
    ls.set(LS_KEYS.sidebarWidth, sidebarWidth.toString());
  }, [sidebarWidth]);

  const updateWidth = useCallback(() => {
    const delta = dragStartX.current - latestX.current;
    const next = Math.max(
      MIN_WIDTH,
      Math.min(dragStartW.current + delta, MAX_WIDTH)
    );

    setSidebarWidth(next);
    rafId.current = null;
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current) return;

    latestX.current = e.clientX;

    // throttle using RAF
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(updateWidth);
    }
  }, [updateWidth]);

  const onMouseUp = useCallback(() => {
    if (!isDragging.current) return;

    isDragging.current = false;
    setIsResizing(false);

    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  const onDragStart = useCallback(
    (e) => {
      e.preventDefault();

      isDragging.current = true;
      setIsResizing(true);

      dragStartX.current = e.clientX;
      dragStartW.current = sidebarWidth;

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [sidebarWidth],
  );

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mouseleave", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mouseleave", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return {
    sidebarWidth,
    isResizing,
    onDragStart,
  };
}

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
  const containerRef = useRef(null);

  const rafId = useRef(null);
  const latestX = useRef(0);
  const currentWidthRef = useRef(350);

  // Load saved width
  useEffect(() => {
    const saved = ls.get(LS_KEYS.sidebarWidth);
    if (saved) {
      const val = parseInt(saved, 10);
      setSidebarWidth(val);
      currentWidthRef.current = val;
    }
  }, []);

  // Persist width only once when React state changes (at the end of drag)
  useEffect(() => {
    ls.set(LS_KEYS.sidebarWidth, sidebarWidth.toString());
  }, [sidebarWidth]);

  const updateWidth = useCallback(() => {
    const delta = dragStartX.current - latestX.current;
    const next = Math.max(
      MIN_WIDTH,
      Math.min(dragStartW.current + delta, MAX_WIDTH)
    );

    // Bypass React re-render cycle during rapid mouse moves
    if (containerRef.current) {
      containerRef.current.style.setProperty("--sidebar-width", `${next}px`);
    }
    
    currentWidthRef.current = next;
    rafId.current = null;
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    latestX.current = e.clientX;

    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(updateWidth);
    }
  }, [updateWidth]);

  const onMouseUp = useCallback(() => {
    if (!isDragging.current) return;

    isDragging.current = false;
    setIsResizing(false);

    // Commit the final width to React state to ensure persistence and consistency
    setSidebarWidth(currentWidthRef.current);

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
      dragStartW.current = currentWidthRef.current;

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [],
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
    containerRef,
  };
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { LS_KEYS } from "@/constants/config";
import { ls } from "@/utils/localStorage";

export default function useSidebar() {
  const [sidebarWidth, setSidebarWidth] = useState(350);

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(0);

  useEffect(() => {
    const savedWidth = ls.get(LS_KEYS.sidebarWidth);
    if (savedWidth) setSidebarWidth(parseInt(savedWidth, 10));
  }, []);

  useEffect(() => {
    ls.set(LS_KEYS.sidebarWidth, sidebarWidth.toString());
  }, [sidebarWidth]);

  const onDragStart = useCallback(
    (e) => {
      isDragging.current = true;
      dragStartX.current = e.clientX;
      dragStartW.current = sidebarWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [sidebarWidth],
  );

  useEffect(() => {
    const up = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    const move = (e) => {
      if (!isDragging.current) return;
      setSidebarWidth(
        Math.max(
          250,
          Math.min(dragStartW.current + (dragStartX.current - e.clientX), 600),
        ),
      );
    };
    window.addEventListener("mouseup", up);
    window.addEventListener("mousemove", move);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("mousemove", move);
    };
  }, []);

  return {
    sidebarWidth,
    onDragStart,
  };
}

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { id } from "@/utils/id";
import { NotificationCard } from "./ui/NotificationCard";

const TYPE_MAP = {
  success: {
    icon: (
      <svg
        className="w-3.5 h-3.5 text-jade"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.5 12.75l6 6 9-13.5"
        />
      </svg>
    ),
    label: "SUCCESS",
  },
  error: {
    icon: (
      <svg
        className="w-3.5 h-3.5 text-danger"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    ),
    label: "ERROR",
  },
  info: {
    icon: (
      <svg
        className="w-3.5 h-3.5 text-amber"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
        />
      </svg>
    ),
    label: "SYSTEM",
  },
};

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(
    (message, type = "success", duration = 3000, icon = null) => {
      const toastId = id.generate(16);
      setToasts((prev) => [...prev, { id: toastId, message, type, icon, duration }]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== toastId)),
        duration,
      );
    },
    [],
  );

  return { toasts, addToast };
}

function ToastItem({ toast }) {
  const theme = TYPE_MAP[toast.type] || TYPE_MAP.success;
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(remaining);
    };
    tick();
    const interval = setInterval(tick, 50);
    return () => clearInterval(interval);
  }, [toast.duration]);

  return (
    <NotificationCard
      label={theme.label}
      message={toast.message}
      progress={progress}
      duration={toast.duration}
      icon={toast.icon || theme.icon}
      className="animate-in slide-in-from-top-4 fade-in duration-300"
    />
  );
}

export function ToastContainer({ toasts }) {
  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-8 left-1/2 -translate-x-1/2 z-[1000] flex flex-col gap-2.5 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
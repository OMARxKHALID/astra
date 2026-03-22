"use client";

import { useState, useCallback } from "react";

const TYPE_MAP = {
  success: {
    icon: (
      <svg
        className="w-3 h-3 text-jade"
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
    bg: "bg-jade/15",
    border: "border-jade/30",
  },
  error: {
    icon: (
      <svg
        className="w-3 h-3 text-danger"
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
    bg: "bg-danger/15",
    border: "border-danger/30",
  },
  info: {
    icon: (
      <svg
        className="w-3 h-3 text-amber-400"
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
    bg: "bg-amber-400/15",
    border: "border-amber-400/30",
  },
};

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(
    (message, type = "success", duration = 3000, icon = null) => {
      const id =
        typeof crypto !== "undefined"
          ? crypto.randomUUID()
          : Date.now().toString();
      setToasts((prev) => [...prev, { id, message, type, icon }]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        duration,
      );
    },
    [],
  );

  return { toasts, addToast };
}

export default function ToastContainer({ toasts }) {
  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[10000] flex flex-col items-center gap-2.5 pb-28 lg:pb-10 pointer-events-none px-4"
    >
      {toasts.map((t) => {
        const theme = TYPE_MAP[t.type] || TYPE_MAP.success;
        return (
          <div
            key={t.id}
            role="status"
            style={{
              animation: "toastIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
            className="toast-pill px-5 py-2.5 rounded-full backdrop-blur-2xl border text-[13px] font-semibold flex items-center gap-3 max-w-sm"
          >
            <div
              className={`w-5 h-5 rounded-full border ${theme.bg} ${theme.border} flex items-center justify-center shrink-0`}
            >
              {t.icon || theme.icon}
            </div>
            <span className="tracking-tight">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, duration = 3000) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return { toasts, addToast };
}

export default function ToastContainer({ toasts }) {
  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed inset-x-0 bottom-0 z-[9999] flex flex-col items-center gap-2 pb-28 lg:pb-8 pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          style={{ animation: "toastIn 0.25s ease forwards" }}
          className="px-5 py-2.5 rounded-2xl
                     bg-surface/95 backdrop-blur-xl
                     border border-white/10
                     text-sm font-medium text-white/90
                     shadow-2xl shadow-black/50"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

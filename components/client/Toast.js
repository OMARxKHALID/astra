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
      className="fixed inset-x-0 bottom-0 z-[10000] flex flex-col items-center gap-3 pb-32 lg:pb-12 pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          style={{ animation: "toastIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
          className="px-6 py-3 rounded-[20px]
                     bg-[#0d1018]/90 backdrop-blur-2xl
                     border border-white/10
                     text-[13px] font-semibold text-white/95
                     shadow-[0_8px_32px_-4px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.05)]
                     flex items-center gap-3 transition-all"
        >
          <div className="w-5 h-5 rounded-full bg-jade/20 border border-jade/30 flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-jade" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <span className="tracking-tight">{t.message}</span>
        </div>
      ))}
    </div>
  );
}


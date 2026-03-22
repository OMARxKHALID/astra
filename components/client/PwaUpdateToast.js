"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Shows a small banner when a new service worker is waiting to activate.
 * The user clicks "Update" to skip waiting and reload with the new version.
 * Only renders in production (SW is disabled in dev).
 */
export default function PwaUpdateToast() {
  const [show, setShow] = useState(false);
  const [reg, setReg] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;

    navigator.serviceWorker.ready.then((registration) => {
      // If a new SW is already waiting, show immediately
      if (registration.waiting) {
        setReg(registration);
        setShow(true);
        return;
      }

      // Otherwise listen for future updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setReg(registration);
            setShow(true);
          }
        });
      });
    });
  }, []);

  function handleUpdate() {
    if (!reg?.waiting) {
      window.location.reload();
      return;
    }
    reg.waiting.postMessage({ type: "SKIP_WAITING" });
    reg.waiting.addEventListener("statechange", (e) => {
      if (e.target.state === "activated") window.location.reload();
    });
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[999] animate-in slide-in-from-bottom-4 duration-300">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-void/95 border border-white/10
                      backdrop-blur-xl shadow-2xl text-sm font-medium"
        style={{ color: "var(--color-text)" }}
      >
        <RefreshCw className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-white/80">A new version is available.</span>
        <button
          onClick={handleUpdate}
          className="px-3 py-1 rounded-full bg-amber-500 text-void text-xs font-black uppercase tracking-wider hover:bg-amber-400 active:scale-95 transition-all"
        >
          Update
        </button>
        <button
          onClick={() => setShow(false)}
          className="text-white/30 hover:text-white/60 transition-colors text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

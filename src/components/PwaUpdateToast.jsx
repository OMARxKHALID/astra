"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

export default function PwaUpdateToast() {
  const [show, setShow] = useState(false);
  const [reg, setReg] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        setReg(registration);
        setShow(true);
        return;
      }

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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 duration-300">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-void/95 border border-white/10
                      backdrop-blur-xl shadow-2xl text-sm font-medium"
        style={{ color: "var(--color-text)" }}
      >
        <Sparkles className="w-4 h-4 text-amber shrink-0 animate-pulse" />
        <span className="text-white/90">A new version is available.</span>
        <button
          onClick={handleUpdate}
          className="px-3 py-1 rounded-full bg-amber text-void text-xs font-black uppercase tracking-wider hover:bg-amber-400 active:scale-95 transition-all"
        >
          Update
        </button>
        <button
          onClick={() => setShow(false)}
          className="text-white/40 hover:text-white/60 transition-colors text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

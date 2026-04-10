"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import NotificationCard from "./ui/NotificationCard";

const COUNTDOWN_S = 5;

export default function AutoNextOverlay({ episodeLabel, onConfirm, onCancel }) {
  const [remaining, setRemaining] = useState(COUNTDOWN_S);
  const firedRef = useRef(false);

  useEffect(() => {
    const tick = setInterval(() => {
      setRemaining((r) => {
        if (r <= 0) {
          clearInterval(tick);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (remaining === 0 && !firedRef.current) {
      firedRef.current = true;
      onConfirm();
    }
  }, [remaining, onConfirm]);

  const handleCancel = () => {
    firedRef.current = true;
    onCancel();
  };

  const progress = ((COUNTDOWN_S - remaining) / COUNTDOWN_S) * 100;

  return (
    <div className="fixed bottom-8 right-6 z-[90]">
      <NotificationCard
        label={`Up Next in ${remaining}s`}
        message={episodeLabel}
        progress={progress}
        className="animate-in slide-in-from-bottom-4 fade-in duration-300"
      >
        <button
          onClick={handleCancel}
          className="absolute top-3.5 right-3 w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/40 hover:text-white/80 transition-all shrink-0 touch-manipulation"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </NotificationCard>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { History, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { LS_KEYS } from "@/constants/config";
import { localStorage } from "@/utils/localStorage";
import { useToast } from "@/components/Toast";
import Image from "next/image";

export function RecentRooms() {
  const router = useRouter();
  const { addToast } = useToast();
  const [showRecent, setShowRecent] = useState(false);
  const [recentRooms, setRecentRooms] = useState([]);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.get(LS_KEYS.history) || "[]");
      const unique = Array.from(new Map(stored.filter(r => r.roomId).map(r => [r.roomId, r])).values());
      setRecentRooms(unique.slice(0, 10));
    } catch {
      setRecentRooms([]);
    }
  }, []);

  useEffect(() => {
    if (!showRecent) return;
    const handler = (e) => {
      setTimeout(() => {
        if (!e.target.closest(".recent-rooms-container")) {
          setShowRecent(false);
        }
      }, 50);
    };
    window.addEventListener("mousedown", handler);
    window.addEventListener("touchstart", handler, { passive: true });
    return () => {
      window.removeEventListener("mousedown", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, [showRecent]);

  const removeRoom = (id, e) => {
    e?.stopPropagation();
    const updated = recentRooms.filter((r) => r.roomId !== id);
    setRecentRooms(updated);
    localStorage.set(LS_KEYS.history, JSON.stringify(updated));
  };

  const clearAll = (e) => {
    e?.stopPropagation();
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setConfirmClear(false);
    setRecentRooms([]);
    localStorage.set(LS_KEYS.history, "[]");
    addToast("Room history cleared", "success");
    setShowRecent(false);
  };

  if (recentRooms.length === 0) return null;

  return (
    <div className="relative recent-rooms-container">
      <Button
        onClick={() => setShowRecent(!showRecent)}
        variant={showRecent ? "primary" : "ghost"}
        className={`!w-[30px] sm:!w-9 !h-[30px] sm:!h-9 !p-0 !rounded-full shrink-0 ${
          showRecent ? "" : "!text-white/40"
        }`}
      >
        <History className="w-4 h-4" />
      </Button>

      {showRecent && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 mt-3 w-72 glass-card rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-top-2 fade-in duration-300 z-50">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/60 mb-0.5">
                Room History
              </span>
              <Button
                variant="custom"
                onClick={clearAll}
                className="w-fit !p-0 text-[10px] font-bold text-danger hover:text-danger-bright uppercase tracking-wider text-left !bg-transparent !border-none !rounded-none !h-auto !scale-none active:!scale-95"
              >
                {confirmClear ? "Tap to confirm" : "Clear All"}
              </Button>
            </div>
            <button
              onClick={() => setShowRecent(false)}
              style={{ color: "var(--color-muted)" }}
              className="hover:opacity-100 opacity-40 p-1"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto no-scrollbar">
            {recentRooms.map((r) => (
              <div
                key={r.roomId}
                className="relative group border-b last:border-0 border-white/10"
              >
                <Button
                  variant="custom"
                  onClick={() => {
                    const urlStr = r.videoUrl ? `?url=${encodeURIComponent(r.videoUrl)}` : "";
                    router.push(`/room/${r.roomId}${urlStr}`);
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-all text-left group-hover:pl-4 duration-300 !h-auto !rounded-none !border-none !bg-transparent !font-body shrink-0 pl-3"
                >
                  {r.thumbnail ? (
                    <div className="relative w-12 h-8 rounded-lg overflow-hidden shrink-0">
                      <Image
                        src={r.thumbnail}
                        alt=""
                        fill
                        className="object-cover brightness-75 transition-all group-hover:brightness-100"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <History className="w-4 h-4 text-white/60" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-[12px] font-bold truncate text-bright">
                      {r.title || `Room ${r.roomId.slice(0, 4)}`}
                    </p>
                    <p className="text-[9px] font-mono text-white/40 mt-0.5 uppercase tracking-tighter">
                      {new Date(r.lastVisited).toLocaleDateString()}
                    </p>
                  </div>
                </Button>
                <Button
                  variant="custom"
                  onClick={(e) => removeRoom(r.roomId, e)}
                  title="Remove"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-danger/70 hover:text-danger hover:bg-danger/10 transition-all opacity-0 group-hover:opacity-100 !p-0 !bg-transparent !border-none !h-6"
                >
                  <XIcon className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

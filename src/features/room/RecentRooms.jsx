"use client";

import { useState, useEffect } from "react";
import { History, X as XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { LS_KEYS } from "@/constants/config";
import { ls } from "@/utils/localStorage";
import Image from "next/image";

export default function RecentRooms() {
  const router = useRouter();
  const [showRecent, setShowRecent] = useState(false);
  const [recentRooms, setRecentRooms] = useState([]);

  useEffect(() => {
    try {
      setRecentRooms(JSON.parse(ls.get(LS_KEYS.history) || "[]"));
    } catch {}
  }, []);

  useEffect(() => {
    if (!showRecent) return;
    const handler = (e) => {
      if (!e.target.closest(".recent-rooms-container")) {
        setShowRecent(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [showRecent]);

  const removeRoom = (id, e) => {
    e?.stopPropagation();
    const updated = recentRooms.filter((r) => r.roomId !== id);
    setRecentRooms(updated);
    ls.set(LS_KEYS.history, JSON.stringify(updated));
  };

  if (recentRooms.length === 0) return null;

  return (
    <div className="relative recent-rooms-container">
      <button
        onClick={() => setShowRecent(!showRecent)}
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all border
          ${
            showRecent
              ? "bg-amber-500 text-void border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              : "text-white/40 hover:text-white/80 hover:bg-white/5"
          }`}
        style={{
          borderColor: showRecent ? undefined : "var(--color-border)",
          backgroundColor: showRecent ? undefined : "var(--color-surface)",
        }}
      >
        <History className="w-5 h-5" />
      </button>

      {showRecent && (
        <div className="absolute top-full right-0 mt-3 w-72 glass-card overflow-hidden shadow-2xl animate-in slide-in-from-top-2 fade-in duration-300 z-50">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
              Room History
            </span>
            <button
              onClick={() => setShowRecent(false)}
              style={{ color: "var(--color-muted)" }}
              className="hover:opacity-100 opacity-40"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto no-scrollbar">
            {recentRooms.map((r) => (
              <div
                key={r.roomId}
                className="relative group border-b last:border-0 border-white/5"
              >
                <button
                  onClick={() => router.push(`/room/${r.roomId}`)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                >
                  {r.thumbnail ? (
                    <Image
                      src={r.thumbnail}
                      alt=""
                      width={48}
                      height={32}
                      className="w-12 h-8 rounded-lg object-cover brightness-75 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                      <History className="w-4 h-4 text-white/10" />
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-xs font-bold truncate">
                      {r.title || `Room ${r.roomId.slice(0, 4)}`}
                    </span>
                    <span className="text-[10px] font-mono text-white/30 truncate">
                      {new Date(r.lastVisited).toLocaleDateString()}
                    </span>
                  </div>
                </button>
                <button
                  onClick={(e) => removeRoom(r.roomId, e)}
                  title="Remove"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-danger/40 hover:text-danger hover:bg-danger/10 transition-all opacity-0 group-hover:opacity-100"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

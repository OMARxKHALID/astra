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

  const clearAll = (e) => {
    e?.stopPropagation();
    if (!window.confirm("Clear all room history?")) return;
    setRecentRooms([]);
    ls.set(LS_KEYS.history, "[]");
    setShowRecent(false);
  };

  if (recentRooms.length === 0) return null;

  return (
    <div className="relative recent-rooms-container">
      <button
        onClick={() => setShowRecent(!showRecent)}
        className={`w-9 h-9 flex items-center justify-center rounded-full transition-all border backdrop-blur-xl
          ${
            showRecent
              ? "bg-[var(--color-amber)] text-void border-[var(--color-amber)] shadow-[0_0_20px_rgba(var(--color-amber-rgb),_0.3)]"
              : "text-white/40 hover:text-white bg-white/5 border-white/10 hover:bg-white/10"
          }`}
      >
        <History className="w-4 h-4" />
      </button>

      {showRecent && (
        <div className="absolute top-full right-0 mt-3 w-72 glass-card rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-top-2 fade-in duration-300 z-50">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/60">
                Room History
              </span>
              <button
                onClick={clearAll}
                className="text-[9px] font-bold text-danger hover:text-danger-bright uppercase tracking-wider text-left transition-colors"
              >
                Clear All
              </button>
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
                <button
                  onClick={() => router.push(`/room/${r.roomId}`)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/10 transition-all text-left group-hover:pl-4 duration-300"
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
                    <div className="w-12 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <History className="w-4 h-4 text-white/60" />
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-xs font-bold truncate">
                      {r.title || `Room ${r.roomId.slice(0, 4)}`}
                    </span>
                    <span className="text-[10px] font-mono text-white/60 truncate">
                      {new Date(r.lastVisited).toLocaleDateString()}
                    </span>
                  </div>
                </button>
                <button
                  onClick={(e) => removeRoom(r.roomId, e)}
                  title="Remove"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-danger/70 hover:text-danger hover:bg-danger/10 transition-all opacity-0 group-hover:opacity-100"
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

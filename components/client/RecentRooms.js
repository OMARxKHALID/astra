"use client";

import { useState, useEffect } from "react";
import { History, X as XIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RecentRooms() {
  const router = useRouter();
  const [showRecent, setShowRecent] = useState(false);
  const [recentRooms, setRecentRooms] = useState([]);

  useEffect(() => {
    const loadRooms = () => {
      try {
        setRecentRooms(JSON.parse(localStorage.getItem("recent_rooms") || "[]"));
      } catch {}
    };
    loadRooms();
    window.addEventListener("storage", loadRooms);
    return () => window.removeEventListener("storage", loadRooms);
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
    const updated = recentRooms.filter(r => r.id !== id);
    setRecentRooms(updated);
    localStorage.setItem("recent_rooms", JSON.stringify(updated));
  };

  if (recentRooms.length === 0) return null;

  return (
    <div className="relative recent-rooms-container">
      <button
        onClick={() => setShowRecent(!showRecent)}
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all border
          ${showRecent 
            ? "bg-amber-500 text-void border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]" 
            : "text-white/40 hover:text-white/80 hover:bg-white/5"}`}
        style={{ 
          borderColor: showRecent ? undefined : "var(--color-border)",
          backgroundColor: showRecent ? undefined : "var(--color-surface)"
        }}
      >
        <History className="w-5 h-5" />
      </button>

      {showRecent && (
        <div 
          className="absolute top-full right-0 mt-3 w-72 glass-card overflow-hidden shadow-2xl animate-in slide-in-from-top-2 fade-in duration-300 z-50 border"
          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-panel)" }}
        >
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: "var(--color-muted)" }}>Room History</span>
            <button onClick={() => setShowRecent(false)} style={{ color: "var(--color-muted)" }} className="hover:opacity-100 opacity-40">
              <XIcon className="w-3 h-3" />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto no-scrollbar">
            {recentRooms.map((r) => (
              <div key={r.id} className="relative group border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                <button
                  onClick={() => router.push(`/room/${r.id}`)}
                  className="w-full flex flex-col gap-1 p-3 hover:bg-white/5 transition-colors text-left"
                >
                  <span className="text-xs font-bold font-display" style={{ color: "var(--color-text)" }}>
                    Room <span className="font-mono text-[10px] ml-1 opacity-40">#{r.id.slice(0, 6)}</span>
                  </span>
                  <span className="text-[10px] font-mono truncate" style={{ color: "var(--color-muted)" }}>{r.url}</span>
                </button>
                <button
                  onClick={(e) => removeRoom(r.id, e)}
                  title="Remove"
                  className="absolute right-2 top-3 w-6 h-6 flex items-center justify-center rounded-full text-danger/40 hover:text-danger hover:bg-danger/10 transition-all opacity-0 group-hover:opacity-100"
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

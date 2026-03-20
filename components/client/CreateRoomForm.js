"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateRoomForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentRooms, setRecentRooms] = useState([]);

  useEffect(() => {
    try {
      setRecentRooms(JSON.parse(localStorage.getItem("recent_rooms") || "[]"));
    } catch {
      setRecentRooms([]);
    }
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: url.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create room");
      }
      const { roomId, hostToken } = await res.json();
      localStorage.setItem(`host_${roomId}`, hostToken);

      try {
        const currentRecent = JSON.parse(localStorage.getItem("recent_rooms") || "[]");
        const newRecent = [{ id: roomId, url: url.trim(), time: Date.now() }, ...currentRecent.filter(r => r.id !== roomId)].slice(0, 3);
        localStorage.setItem("recent_rooms", JSON.stringify(newRecent));
      } catch (e) {}

      router.push(`/room/${roomId}?url=${encodeURIComponent(url.trim())}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  function handleRemoveRoom(roomId, e) {
    e?.stopPropagation();
    const updated = recentRooms.filter(r => r.id !== roomId);
    setRecentRooms(updated);
    localStorage.setItem("recent_rooms", JSON.stringify(updated));
  }

  return (
    <div className="glass-card p-7">
      <div className="mb-6">
        <h2 className="font-display text-xl font-semibold text-bright mb-1">
          Start a new room
        </h2>
        <p className="text-sm text-muted/80">
          You&apos;ll be the host — share the link to invite friends.
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label
            htmlFor="videoUrl"
            className="block text-[11px] font-mono font-bold text-amber-400/80 uppercase tracking-widest mb-2"
          >
            Video URL
          </label>
          <input
            id="videoUrl"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/video.mp4"
            required
            className="w-full bg-void/60 border border-white/8 rounded-[2rem] px-4 py-3
                       text-sm text-text placeholder:text-white/15 font-mono
                       outline-none transition-all duration-200
                       focus:border-amber-500/40
                       focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)]"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-[2rem] bg-danger/8 border border-danger/20">
            <span className="text-danger text-base leading-none mt-0.5">⚠</span>
            <p className="text-sm text-danger/80 font-mono">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="w-full h-12 rounded-[2rem] bg-amber-500 text-void font-black text-sm
                     uppercase tracking-widest flex items-center justify-center gap-2
                     hover:bg-amber-400 active:scale-[0.98] transition-all
                     disabled:opacity-40 disabled:pointer-events-none
                     shadow-lg shadow-amber-500/15 ring-1 ring-amber-400/40"
        >
          {loading ? (
            <>
              <Spinner />
              Creating room…
            </>
          ) : (
            <>
              <PlusIcon className="w-4 h-4" />
              Create Room
            </>
          )}
        </button>
      </form>
      <p className="mt-5 text-[11px] text-muted/50 text-center font-mono pb-2">
        Supports MP4 · WebM · HLS · YouTube · Vimeo
      </p>

      {recentRooms.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5 animate-fadeIn">
          <p className="text-[10px] font-mono text-muted/60 uppercase tracking-widest mb-2 px-1">Your Recent Rooms</p>
          <div className="flex flex-col gap-1.5">
            {recentRooms.map((r) => (
              <div key={r.id} className="relative group">
                <button
                  onClick={() => router.push(`/room/${r.id}`)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-[2rem] hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 group-hover:bg-amber-400 group-hover:shadow-[0_0_8px_rgba(245,158,11,0.5)] transition-all" />
                  <div className="flex-1 min-w-0 pr-8">
                    <p className="text-xs font-bold text-white/90 truncate font-display">Room <span className="font-mono font-medium text-white/50 bg-white/10 px-1 py-0.5 rounded ml-1 text-[10px]">{r.id.slice(0, 6)}</span></p>
                    <p className="text-[10px] text-muted truncate leading-tight mt-0.5 max-w-[90%]">{r.url}</p>
                  </div>
                  <div className="shrink-0 text-[10px] font-mono font-bold text-amber-500/0 group-hover:text-amber-500 transition-colors uppercase mr-6">Join &rarr;</div>
                </button>
                <button 
                  onClick={(e) => handleRemoveRoom(r.id, e)}
                  title="Remove from history"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 z-10"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlusIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="48"
        strokeDashoffset="12"
      />
    </svg>
  );
}

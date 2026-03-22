"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle as ExclamationIcon,
  Plus as PlusIcon,
  X as XIcon,
  Loader2 as SpinnerIcon,
} from "lucide-react";

export default function CreateRoomForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentRooms, setRecentRooms] = useState([]);

  useEffect(() => {
    try {
      setRecentRooms(JSON.parse(localStorage.getItem("recent_rooms") || "[]"));
    } catch {}
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
        const d = await res.json();
        throw new Error(d.error || "Failed to create room");
      }
      const { roomId, hostToken } = await res.json();
      localStorage.setItem(`host_${roomId}`, hostToken);
      try {
        const cur = JSON.parse(localStorage.getItem("recent_rooms") || "[]");
        localStorage.setItem(
          "recent_rooms",
          JSON.stringify(
            [
              { id: roomId, url: url.trim(), time: Date.now() },
              ...cur.filter((r) => r.id !== roomId),
            ].slice(0, 3),
          ),
        );
      } catch {}
      router.push(`/room/${roomId}?url=${encodeURIComponent(url.trim())}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  function handleRemoveRoom(roomId, e) {
    e?.stopPropagation();
    const updated = recentRooms.filter((r) => r.id !== roomId);
    setRecentRooms(updated);
    localStorage.setItem("recent_rooms", JSON.stringify(updated));
  }

  return (
    <div className="glass-card p-7">
      <div className="mb-6">
        <h2
          className="font-display text-xl font-semibold mb-1"
          style={{ color: "var(--color-bright)" }}
        >
          Start a new room
        </h2>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          You&apos;ll be the host — share the link to invite friends.
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label
            htmlFor="videoUrl"
            className="block text-[11px] font-mono font-bold text-amber-500 uppercase tracking-widest mb-2"
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
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
              color: "var(--color-text)",
            }}
            className="w-full border rounded-[2rem] px-4 py-3 text-sm font-mono
                       outline-none transition-all placeholder:opacity-30
                       focus:border-amber-500/50 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.1)]"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-[2rem] bg-danger/8 border border-danger/20">
            <ExclamationIcon className="w-4 h-4 text-danger shrink-0 mt-0.5" strokeWidth={2.5} />
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

      <p
        className="mt-5 text-[11px] text-center font-mono pb-2"
        style={{ color: "var(--color-muted)", opacity: 0.5 }}
      >
        Supports MP4 · WebM · HLS · YouTube · Vimeo
      </p>

      {recentRooms.length > 0 && (
        <div
          className="mt-4 pt-4 animate-fadeIn"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <p
            className="text-[10px] font-mono uppercase tracking-widest mb-2 px-1"
            style={{ color: "var(--color-muted)", opacity: 0.6 }}
          >
            Your Recent Rooms
          </p>
          <div className="flex flex-col gap-1.5">
            {recentRooms.map((r) => (
              <div key={r.id} className="relative group">
                <button
                  onClick={() => router.push(`/room/${r.id}`)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-[2rem] transition-colors border border-transparent hover:border-amber-500/15"
                  style={{
                    ["&:hover"]: { backgroundColor: "var(--color-surface)" },
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      "var(--color-surface)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "")
                  }
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 group-hover:bg-amber-400 transition-all shrink-0" />
                  <div className="flex-1 min-w-0 pr-8">
                    <p
                      className="text-xs font-bold truncate font-display"
                      style={{ color: "var(--color-text)" }}
                    >
                      Room{" "}
                      <span
                        className="font-mono font-medium text-[10px] px-1 py-0.5 rounded ml-1"
                        style={{
                          backgroundColor: "var(--color-panel)",
                          color: "var(--color-muted)",
                        }}
                      >
                        {r.id.slice(0, 6)}
                      </span>
                    </p>
                    <p
                      className="text-[10px] truncate leading-tight mt-0.5 max-w-[90%]"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {r.url}
                    </p>
                  </div>
                  <div className="shrink-0 text-[10px] font-mono font-bold text-amber-500 opacity-0 group-hover:opacity-100 transition-colors uppercase mr-6">
                    Join →
                  </div>
                </button>
                <button
                  onClick={(e) => handleRemoveRoom(r.id, e)}
                  title="Remove"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-danger/50 hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100 z-10"
                >
                  <XIcon className="w-3 h-3" strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return <SpinnerIcon className="w-4 h-4 animate-spin" />;
}

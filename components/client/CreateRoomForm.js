"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateRoomForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

      router.push(`/room/${roomId}?url=${encodeURIComponent(url.trim())}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
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
            className="w-full bg-void/60 border border-white/8 rounded-xl px-4 py-3
                       text-sm text-text placeholder:text-white/15 font-mono
                       outline-none transition-all duration-200
                       focus:border-amber-500/40
                       focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)]"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-danger/8 border border-danger/20">
            <span className="text-danger text-base leading-none mt-0.5">⚠</span>
            <p className="text-sm text-danger/80 font-mono">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="w-full h-12 rounded-xl bg-amber-500 text-void font-black text-sm
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

      <p className="mt-5 text-[11px] text-muted/50 text-center font-mono">
        Supports MP4 · WebM · HLS · YouTube · Vimeo
      </p>
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

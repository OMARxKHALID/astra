"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CreateRoomForm from "@/components/client/CreateRoomForm";
import RecentRooms from "@/components/client/RecentRooms";
import { Film as FilmIcon } from "lucide-react";

// Isolated so useSearchParams() is inside a Suspense boundary (required by Next.js)
function KickedNotification() {
  const searchParams = useSearchParams();
  const [kickedMsg, setKickedMsg] = useState(null);

  useEffect(() => {
    if (searchParams.get("kicked") !== "1") return;
    let msg = "You were removed from the room.";
    try {
      const stored = sessionStorage.getItem("wt_kicked");
      if (stored) msg = stored;
      sessionStorage.removeItem("wt_kicked");
    } catch {}
    setKickedMsg(msg);
    const t = setTimeout(() => setKickedMsg(null), 6000);
    return () => clearTimeout(t);
  }, [searchParams]);

  if (!kickedMsg) return null;

  return (
    <div
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[10000] flex flex-col items-center pb-10 pointer-events-none px-4"
    >
      <div
        style={{
          animation: "toastIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
        className="toast-pill px-5 py-2.5 rounded-full backdrop-blur-2xl border text-[13px] font-semibold flex items-center gap-3 max-w-sm pointer-events-auto"
      >
        <div className="w-5 h-5 rounded-full border bg-danger/15 border-danger/30 flex items-center justify-center shrink-0">
          <svg
            className="w-3 h-3 text-danger"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <span className="tracking-tight">{kickedMsg}</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [hasResults, setHasResults] = useState(false);

  return (
    <main
      className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 relative overflow-y-auto overflow-x-hidden no-scrollbar"
      style={{
        backgroundColor: "var(--color-void)",
        color: "var(--color-text)",
      }}
    >
      {/* Ambient background blobs */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full bg-amber-500/6 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] rounded-full bg-jade/4 blur-[100px]" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(127,127,127,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(127,127,127,.4) 1px,transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Kicked notification — Suspense required by Next.js for useSearchParams */}
      <Suspense fallback={null}>
        <KickedNotification />
      </Suspense>

      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <RecentRooms />
      </div>

      {/* Hero — hidden once search results appear to give the form more space */}
      {!hasResults && (
        <div className="relative z-10 text-center mb-6 max-w-xl animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[2rem] bg-amber-500 shadow-2xl shadow-amber-500/20 mb-6 ring-1 ring-amber-400/50 mx-auto">
            <FilmIcon className="w-8 h-8 text-void" />
          </div>
          <h1
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-3"
            style={{ color: "var(--color-bright)" }}
          >
            Watch Together,
            <br />
            <span className="text-amber-400">perfectly in sync</span>
          </h1>
          <p
            className="text-base leading-relaxed max-w-sm mx-auto"
            style={{ color: "var(--color-dim)" }}
          >
            Create a private room, share the link, and watch any video with
            friends — all in real time.
          </p>
        </div>
      )}

      <div
        className={`relative z-10 w-full max-w-xl pb-12 transition-all duration-700 ${hasResults ? "pt-12" : ""}`}
      >
        <CreateRoomForm onResultsChange={setHasResults} />
      </div>
    </main>
  );
}

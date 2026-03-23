"use client";

import { useState } from "react";
import CreateRoomForm from "@/components/client/CreateRoomForm";
import RecentRooms from "@/components/client/RecentRooms";
import { Film as FilmIcon } from "lucide-react";

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

"use client";
import { useState, useRef, useEffect } from "react";

export default function PasswordModal({ roomId, onSubmit, error }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!pw.trim()) return;
    onSubmit(pw.trim());
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-void/95 backdrop-blur-xl">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_40%,rgba(245,158,11,0.08),transparent_60%)]" />

      <div className="relative z-10 w-full max-w-sm mx-4 glass-card rounded-[2.5rem] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 px-8 pt-8 pb-5 border-b border-white/5">
          <div className="w-14 h-14 rounded-[1.75rem] bg-amber-500/12 border border-amber-500/25 flex items-center justify-center">
            {/* Lock icon */}
            <svg
              className="w-7 h-7 text-amber-500/80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <div className="text-center">
            <h2 className="font-display font-bold text-lg text-white/90">
              Password Protected
            </h2>
            <p className="text-[12px] text-white/40 font-mono mt-1">
              Room{" "}
              <span className="text-white/60 font-bold">
                {roomId.slice(0, 6).toUpperCase()}
              </span>{" "}
              requires a password
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type={show ? "text" : "password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Enter room password…"
              maxLength={64}
              className="w-full bg-void/60 border border-white/10 rounded-[2rem] px-5 py-3.5
                         text-sm text-white placeholder:text-white/20 font-mono outline-none
                         transition-all focus:border-amber-500/40 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)]
                         pr-12"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center
                         rounded-full text-white/30 hover:text-white/60 transition-colors"
            >
              {show ? (
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-[2rem] bg-danger/8 border border-danger/20">
              <svg
                className="w-4 h-4 text-danger shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-sm text-danger/80 font-mono">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!pw.trim()}
            className="w-full h-12 rounded-[2rem] bg-amber-500 text-void font-black text-sm
                       uppercase tracking-widest flex items-center justify-center gap-2
                       hover:bg-amber-400 active:scale-[0.98] transition-all
                       disabled:opacity-40 disabled:pointer-events-none
                       shadow-lg shadow-amber-500/15 ring-1 ring-amber-400/40"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
}

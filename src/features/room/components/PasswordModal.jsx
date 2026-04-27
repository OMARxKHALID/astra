"use client";
import { useState, useRef, useEffect } from "react";
import {
  Lock as LockIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  AlertTriangle as ExclamationIcon,
} from "lucide-react";

export default function PasswordModal({ roomId, onSubmit, error }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
          e.preventDefault();
          (e.shiftKey ? last : first)?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!pw.trim()) return;
    onSubmit(pw.trim());
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-xl"
      style={{ backgroundColor: "var(--color-void)", opacity: undefined }}
    >
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_40%,rgba(var(--color-amber-rgb), 0.08),transparent_60%)]" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-modal-title"
        className="relative z-10 w-full max-w-sm mx-4 glass-card rounded-[var(--radius-panel)] overflow-hidden shadow-2xl"
      >
        <div
          className="flex flex-col items-center gap-3 px-8 pt-8 pb-5"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="w-14 h-14 rounded-[1.75rem] bg-amber/12 border border-amber/25 flex items-center justify-center">
            <LockIcon className="w-7 h-7 text-amber/80" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <h2
              id="password-modal-title"
              className="font-display font-bold text-lg"
              style={{ color: "var(--color-text)" }}
            >
              Password Protected
            </h2>
            <p
              className="text-[12px] font-mono mt-1"
              style={{ color: "var(--color-muted)" }}
            >
              Room{" "}
              <span className="font-bold" style={{ color: "var(--color-dim)" }}>
                {roomId.slice(0, 6).toUpperCase()}
              </span>{" "}
              requires a password
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type={show ? "text" : "password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Enter room password…"
              maxLength={64}
              className="w-full border rounded-[var(--radius-pill)] px-5 py-3.5 text-sm font-mono outline-none transition-all pr-12"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
                color: "var(--color-text)",
              }}
            />
            <button
              type="button"
              aria-label={show ? "Hide password" : "Show password"}
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full transition-colors focus-visible:ring-2"
              style={{ color: "var(--color-muted)" }}
            >
              {show ? (
                <EyeOffIcon className="w-4 h-4" />
              ) : (
                <EyeIcon className="w-4 h-4" />
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-pill)] bg-danger/8 border border-danger/20">
              <ExclamationIcon
                className="w-4 h-4 text-danger shrink-0"
                strokeWidth={2.5}
              />
              <p className="text-sm text-danger/80 font-mono">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!pw.trim()}
            className="w-full h-12 rounded-[var(--radius-pill)] bg-amber text-void font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-amber/15 ring-1 ring-amber/40 focus-visible:ring-2 focus-visible:ring-amber/60"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
}

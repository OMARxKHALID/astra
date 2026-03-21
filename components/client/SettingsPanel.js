"use client";

import { useState, useRef, useEffect } from "react";
import { ShieldIcon, LockIcon, UnlockIcon, TheatreIcon } from "./Icons";

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ enabled, onToggle, disabled = false }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={enabled}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0
        ${enabled ? "bg-amber-500" : "bg-white/10"}
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200
        ${enabled ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function Row({ label, description, enabled, onToggle, disabled, icon }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && <div className="text-white/35 shrink-0">{icon}</div>}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white/80 leading-tight">
            {label}
          </p>
          {description && (
            <p className="text-[10px] text-white/30 font-mono mt-0.5 leading-snug">
              {description}
            </p>
          )}
        </div>
      </div>
      <Toggle enabled={enabled} onToggle={onToggle} disabled={disabled} />
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function Section({ children }) {
  return (
    <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.28em] mt-4 mb-0.5">
      {children}
    </p>
  );
}

// ─── SettingsPanel ────────────────────────────────────────────────────────────
export default function SettingsPanel({
  isOpen,
  onClose,
  isHost,
  // Room settings
  hostOnlyControls,
  strictVideoUrlMode,
  onToggleHostControls,
  onToggleStrictVideoUrlMode,
  hasPassword,
  onSetPassword,
  // Player settings
  screenshotEnabled,
  setScreenshotEnabled,
  hlsQualityEnabled,
  setHlsQualityEnabled,
  speedSyncEnabled,
  setSpeedSyncEnabled,
  theatreMode,
  onToggleTheatre,
}) {
  const panelRef = useRef(null);
  const [pwInput, setPwInput] = useState("");
  const [pwMode, setPwMode] = useState("idle"); // "idle" | "set" | "remove"

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function submitPassword(e) {
    e.preventDefault();
    onSetPassword(pwMode === "set" ? pwInput.trim() : "");
    setPwInput("");
    setPwMode("idle");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        className="relative z-10 w-full sm:max-w-sm mx-4 sm:mx-auto glass-card rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/5">
          <div>
            <h2 className="font-display font-bold text-base text-white/90">
              Room Settings
            </h2>
            <p className="text-[10px] text-white/30 font-mono uppercase tracking-wider mt-0.5">
              {isHost ? "You are the host" : "Read only — host controls these"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/8 text-white/40 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div
          className="px-6 py-2 max-h-[72vh] overflow-y-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {/* ── Playback ── */}
          <Section>Playback</Section>

          <Row
            label="Lock to host only"
            description="Only the host can play, pause, and seek"
            enabled={hostOnlyControls}
            onToggle={onToggleHostControls}
            disabled={!isHost}
            icon={
              hostOnlyControls ? (
                <LockIcon className="w-4 h-4 text-amber-400" />
              ) : (
                <UnlockIcon className="w-4 h-4" />
              )
            }
          />

          <Row
            label="Speed sync"
            description="Force all viewers to match host playback speed"
            enabled={speedSyncEnabled}
            onToggle={() => setSpeedSyncEnabled((v) => !v)}
            disabled={!isHost}
            icon={
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            }
          />

          {/* ── Security ── */}
          <Section>Security</Section>

          <Row
            label="Strict URL mode"
            description="Only allow direct video file links (.mp4, .m3u8…)"
            enabled={strictVideoUrlMode}
            onToggle={onToggleStrictVideoUrlMode}
            disabled={!isHost}
            icon={<ShieldIcon className="w-4 h-4" />}
          />

          {/* Password — host only */}
          {isHost && (
            <div className="py-3 border-b border-white/5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <svg
                    className="w-4 h-4 text-white/35 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-white/80">
                      Room password
                    </p>
                    <p className="text-[10px] text-white/30 font-mono mt-0.5">
                      {hasPassword
                        ? "Password is set"
                        : "Anyone with the link can join"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setPwMode(
                      pwMode !== "idle"
                        ? "idle"
                        : hasPassword
                          ? "remove"
                          : "set",
                    )
                  }
                  className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-[2rem] transition-all border
                    ${
                      hasPassword
                        ? "bg-danger/10 text-danger border-danger/20 hover:bg-danger/20"
                        : "bg-jade/10 text-jade border-jade/20 hover:bg-jade/20"
                    }`}
                >
                  {hasPassword ? "Remove" : "Set"}
                </button>
              </div>
              {pwMode !== "idle" && (
                <form
                  onSubmit={submitPassword}
                  className="mt-3 flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
                >
                  {pwMode === "set" ? (
                    <input
                      autoFocus
                      value={pwInput}
                      onChange={(e) => setPwInput(e.target.value)}
                      placeholder="New password…"
                      maxLength={64}
                      className="flex-1 bg-void/60 border border-white/10 rounded-[2rem] px-4 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-amber-500/40 font-mono"
                    />
                  ) : (
                    <p className="flex-1 text-sm text-danger/80 font-mono py-2">
                      Remove room password?
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={pwMode === "set" && !pwInput.trim()}
                    className="px-4 py-2 rounded-[2rem] bg-amber-500 text-void text-[11px] font-black uppercase tracking-wider hover:bg-amber-400 active:scale-95 disabled:opacity-30 transition-all"
                  >
                    Confirm
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ── View ── */}
          <Section>View</Section>

          <Row
            label="Theatre mode"
            description="Full-screen video, dim everything else (T)"
            enabled={theatreMode}
            onToggle={onToggleTheatre}
            icon={<TheatreIcon className="w-4 h-4" />}
          />

          {/* ── Player ── */}
          <Section>Player</Section>

          <Row
            label="Screenshot to chat"
            description="Camera button snaps a frame to the chat"
            enabled={screenshotEnabled}
            onToggle={() => setScreenshotEnabled((v) => !v)}
            icon={
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            }
          />

          <Row
            label="HLS quality indicator"
            description="Shows resolution & bitrate for live streams"
            enabled={hlsQualityEnabled}
            onToggle={() => setHlsQualityEnabled((v) => !v)}
            icon={
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
          />

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

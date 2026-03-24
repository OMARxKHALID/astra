"use client";

import { useState, useRef, useEffect } from "react";
import {
  Shield as ShieldIcon,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  X as XIcon,
  Zap,
  Camera,
  BarChart2,
  Monitor,
  Sparkles,
  Key as KeyIcon,
  Eye,
  EyeOff,
} from "lucide-react";

function Toggle({ enabled, onToggle, disabled = false }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={enabled}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 shrink-0
        ${enabled ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.35)]" : "bg-white/10"}
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300
        ${enabled ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

function Row({ label, description, enabled, onToggle, disabled, icon }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/[0.05] last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div
            className={`w-8 h-8 rounded-[2rem] flex items-center justify-center shrink-0 transition-colors ${enabled ? "bg-amber-500/10 text-amber-400" : "bg-white/5 text-white/25"}`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p
            className="text-[13px] font-semibold leading-tight"
            style={{ color: "var(--color-text)" }}
          >
            {label}
          </p>
          {description && (
            <p
              className="text-[10px] mt-0.5 leading-snug font-mono truncate"
              style={{ color: "var(--color-muted)" }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
      <Toggle enabled={enabled} onToggle={onToggle} disabled={disabled} />
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p
      className="text-[9px] font-black uppercase tracking-[0.28em] mt-5 mb-1 px-1"
      style={{ color: "var(--color-muted)" }}
    >
      {children}
    </p>
  );
}

export default function SettingsPanel({
  isOpen,
  onClose,
  isHost,
  hostOnlyControls,
  strictVideoUrlMode,
  onToggleHostControls,
  onToggleStrictVideoUrlMode,
  hasPassword,
  onSetPassword,
  screenshotEnabled,
  setScreenshotEnabled,
  hlsQualityEnabled,
  setHlsQualityEnabled,
  scrubPreviewEnabled,
  setScrubPreviewEnabled,
  speedSyncEnabled,
  setSpeedSyncEnabled,
  ambilightEnabled,
  setAmbilightEnabled,
  urlBarPosition,
  onSetUrlBarPosition,
}) {
  const panelRef = useRef(null);
  const [pwInput, setPwInput] = useState("");
  const [pwMode, setPwMode] = useState("idle");
  const [showPw, setShowPw] = useState(false);

  // Close on outside click — small delay so the open-click doesn't immediately re-close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    const id = setTimeout(
      () => document.addEventListener("mousedown", handler),
      0,
    );
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handler);
    };
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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        className="relative z-10 w-full sm:max-w-lg mx-4 sm:mx-auto glass-card rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-white/[0.05]">
          <div>
            <h2
              className="font-display font-bold text-xl"
              style={{ color: "var(--color-text)" }}
            >
              Settings
            </h2>
            <p
              className="text-[10px] font-mono mt-0.5 uppercase tracking-wider"
              style={{ color: "var(--color-muted)" }}
            >
              {isHost ? "You are the host" : "Host controls only"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-[2rem] hover:bg-white/10 transition-colors"
            style={{ color: "var(--color-muted)" }}
          >
            <XIcon className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="px-7 pb-7 max-h-[75vh] overflow-y-auto no-scrollbar">
          <SectionLabel>Playback</SectionLabel>
          <Row
            label="Host-only controls"
            description="Only the host can play, pause, and seek"
            enabled={hostOnlyControls}
            onToggle={onToggleHostControls}
            disabled={!isHost}
            icon={
              hostOnlyControls ? (
                <LockIcon className="w-4 h-4" />
              ) : (
                <UnlockIcon className="w-4 h-4" />
              )
            }
          />
          <Row
            label="Speed sync"
            description="All viewers match the host's playback speed"
            enabled={speedSyncEnabled}
            onToggle={() => setSpeedSyncEnabled((v) => !v)}
            disabled={!isHost}
            icon={<Zap className="w-4 h-4" />}
          />

          <SectionLabel>Player</SectionLabel>
          <Row
            label="Screenshot to chat"
            description="Camera button snaps a frame into chat"
            enabled={screenshotEnabled}
            onToggle={() => setScreenshotEnabled((v) => !v)}
            icon={<Camera className="w-4 h-4" />}
          />
          <Row
            label="HLS quality indicator"
            description="Shows resolution & bitrate for live streams"
            enabled={hlsQualityEnabled}
            onToggle={() => setHlsQualityEnabled((v) => !v)}
            icon={<BarChart2 className="w-4 h-4" />}
          />
          <Row
            label="Scrubber preview"
            description="Thumbnail on seek bar hover (MP4/HLS only)"
            enabled={scrubPreviewEnabled}
            onToggle={() => setScrubPreviewEnabled((v) => !v)}
            icon={<Monitor className="w-4 h-4" />}
          />
          <Row
            label="Ambilight"
            description="Dynamic background glow from video colors"
            enabled={ambilightEnabled}
            onToggle={() => setAmbilightEnabled((v) => !v)}
            icon={<Sparkles className="w-4 h-4" />}
          />
          <Row
            label="URL bar at top"
            description="Move URL input bar above the video player"
            enabled={urlBarPosition === "top"}
            onToggle={() =>
              onSetUrlBarPosition(urlBarPosition === "top" ? "bottom" : "top")
            }
            icon={<Monitor className="w-4 h-4" />}
          />

          <SectionLabel>Security</SectionLabel>
          <Row
            label="Strict URL mode"
            description="Only allow direct video file links"
            enabled={strictVideoUrlMode}
            onToggle={onToggleStrictVideoUrlMode}
            disabled={!isHost}
            icon={<ShieldIcon className="w-4 h-4" />}
          />

          {isHost && (
            <div className="pt-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-[2rem] flex items-center justify-center shrink-0 ${hasPassword ? "bg-amber-500/10 text-amber-400" : "bg-white/5 text-white/25"}`}
                  >
                    <KeyIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p
                      className="text-[13px] font-semibold"
                      style={{ color: "var(--color-text)" }}
                    >
                      Room password
                    </p>
                    <p
                      className="text-[10px] font-mono"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {hasPassword
                        ? "Password is set"
                        : "Open to anyone with the link"}
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
                  className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-[2rem] border transition-all shrink-0
                    ${hasPassword ? "bg-danger/10 text-danger border-danger/20 hover:bg-danger/20" : "bg-jade/10 text-jade border-jade/20 hover:bg-jade/20"}`}
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
                    <div className="flex-1 relative">
                      <input
                        autoFocus
                        type={showPw ? "text" : "password"}
                        value={pwInput}
                        onChange={(e) => setPwInput(e.target.value)}
                        placeholder="New password…"
                        maxLength={64}
                        className="w-full pr-10 bg-white/5 border border-white/10 rounded-[2rem] px-4 py-2 text-sm outline-none focus:border-amber-500/40 font-mono"
                        style={{ color: "var(--color-text)" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {showPw ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <p className="flex-1 text-sm font-mono py-2 text-danger">
                      Remove room password?
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={pwMode === "set" && !pwInput.trim()}
                    className="px-4 py-2 rounded-[2rem] bg-amber-500 text-void text-[11px] font-black uppercase tracking-wider hover:bg-amber-400 active:scale-95 disabled:opacity-30 transition-all shrink-0"
                  >
                    Confirm
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

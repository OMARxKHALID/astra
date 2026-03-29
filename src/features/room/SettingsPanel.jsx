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
import { useToast } from "@/components/Toast";

function Toggle({ enabled, onToggle, disabled = false }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={enabled}
      className={`relative w-10 h-5 rounded-full transition-all duration-300 shrink-0
        ${enabled ? "bg-amber shadow-[0_0_10px_rgba(var(--color-amber-rgb), 0.35)]" : "bg-white/10"}
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-[2px] left-[2px] w-4 h-4 rounded-full shadow transition-transform duration-300
        ${enabled ? "translate-x-[20px] bg-void" : "translate-x-0 bg-white/90"}`}
      />
    </button>
  );
}

function Row({ label, description, enabled, onToggle, disabled, icon }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-white/[0.05] last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div
            className={`w-7 h-7 rounded-[var(--radius-pill)] flex items-center justify-center shrink-0 transition-colors ${enabled ? "bg-amber/10 text-amber" : "bg-white/10 text-white/50"}`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-bold leading-tight text-white/90">
            {label}
          </p>
          {description && (
            <p className="text-[10px] mt-0.5 leading-snug font-mono truncate text-white/50">
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
    <p className="text-[9px] font-black uppercase tracking-[0.28em] mt-4 mb-0.5 px-1 text-white/40">
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
}) {
  const { addToast } = useToast();
  const panelRef = useRef(null);
  const [pwInput, setPwInput] = useState("");
  const [pwMode, setPwMode] = useState("idle");
  const [showPw, setShowPw] = useState(false);

  const toggleAndToast = (setter, label, currentVal) => {
    const next = !currentVal;
    setter(next);
    addToast(`${label} ${next ? "Enabled" : "Disabled"}`, "success");
  };

  // [Note] small delay so the open-click doesn't immediately re-close
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
    addToast(
      pwMode === "set" ? "Password set successfully" : "Password removed",
      "success",
    );
    setPwInput("");
    setPwMode("idle");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-void/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        className="relative z-10 w-full sm:max-w-[480px] mx-4 sm:mx-auto glass-card rounded-[var(--radius-panel)] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300 border-none"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/[0.05]">
          <div>
            <h2 className="font-display font-bold text-lg text-white/90">
              Settings
            </h2>
            <p className="text-[9px] font-mono mt-0.5 uppercase tracking-wider text-white/50">
              {isHost ? "You are the host" : "Host controls only"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-pill)] hover:bg-white/10 transition-colors text-white/50 hover:text-white"
          >
            <XIcon className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="px-6 pb-6 max-h-[75vh] overflow-y-auto no-scrollbar">
          <SectionLabel>Playback</SectionLabel>
          <Row
            label="Host-only controls"
            description="Only the host can play, pause, and seek"
            enabled={hostOnlyControls}
            onToggle={() => {
              onToggleHostControls();
              addToast(
                `Host Controls ${!hostOnlyControls ? "Locked" : "Unlocked"}`,
                "success",
              );
            }}
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
            onToggle={() =>
              toggleAndToast(
                setSpeedSyncEnabled,
                "Speed Sync",
                speedSyncEnabled,
              )
            }
            disabled={!isHost}
            icon={<Zap className="w-4 h-4" />}
          />

          <SectionLabel>Player</SectionLabel>
          <Row
            label="Screenshot to chat"
            description="Camera button snaps a frame into chat"
            enabled={screenshotEnabled}
            onToggle={() =>
              toggleAndToast(
                setScreenshotEnabled,
                "Screenshots",
                screenshotEnabled,
              )
            }
            icon={<Camera className="w-4 h-4" />}
          />
          <Row
            label="HLS quality indicator"
            description="Shows resolution & bitrate for live streams"
            enabled={hlsQualityEnabled}
            onToggle={() =>
              toggleAndToast(
                setHlsQualityEnabled,
                "HLS Indicator",
                hlsQualityEnabled,
              )
            }
            icon={<BarChart2 className="w-4 h-4" />}
          />
          <Row
            label="Scrubber preview"
            description="Thumbnail on seek bar hover (MP4/HLS only)"
            enabled={scrubPreviewEnabled}
            onToggle={() =>
              toggleAndToast(
                setScrubPreviewEnabled,
                "Scrub Preview",
                scrubPreviewEnabled,
              )
            }
            icon={<Monitor className="w-4 h-4" />}
          />
          <Row
            label="Ambilight"
            description="Dynamic background glow from video colors"
            enabled={ambilightEnabled}
            onToggle={() =>
              toggleAndToast(setAmbilightEnabled, "Ambilight", ambilightEnabled)
            }
            icon={<Sparkles className="w-4 h-4" />}
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
                    className={`w-7 h-7 rounded-[var(--radius-pill)] flex items-center justify-center shrink-0 ${hasPassword ? "bg-amber/10 text-amber" : "bg-white/10 text-white/50"}`}
                  >
                    <KeyIcon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-white/90">
                      Room password
                    </p>
                    <p className="text-[10px] font-mono text-white/50 mt-0.5">
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
                  className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-[var(--radius-pill)] border transition-all shrink-0
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
                        className="w-full pr-10 bg-white/5 border border-white/10 rounded-[var(--radius-pill)] px-4 py-2 text-xs outline-none focus:border-amber/40 font-mono text-white/90 placeholder-white/30 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                      >
                        {showPw ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
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
                    className="px-4 py-2 rounded-[var(--radius-pill)] bg-amber text-void text-[11px] font-black uppercase tracking-wider hover:bg-amber active:scale-95 disabled:opacity-30 transition-all shrink-0"
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

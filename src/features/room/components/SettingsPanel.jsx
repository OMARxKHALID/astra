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
  User,
  Check,
  Pencil,
} from "lucide-react";
import Button from "@/components/ui/Button";

function Toggle({ enabled, onToggle, disabled = false, label }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={enabled}
      aria-label={label}
      className={`relative w-10 h-5 rounded-full transition-all duration-300 shrink-0 focus-visible:ring-2 focus-visible:ring-amber/70 focus-visible:outline-none
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
      <Toggle
        enabled={enabled}
        onToggle={onToggle}
        disabled={disabled}
        label={label}
      />
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
  mirrorCameraEnabled,
  setMirrorCameraEnabled,
  syncHubEnabled,
  setSyncHubEnabled,
  identity,
  addToast,
}) {
  const panelRef = useRef(null);
  const [pwInput, setPwInput] = useState("");
  const [pwMode, setPwMode] = useState("idle");
  const [showPw, setShowPw] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(identity?.displayName || "");

  const toggleAndToast = (setter, label, currentVal) => {
    const next = !currentVal;
    setter(next);
    addToast(`${label} ${next ? "Enabled" : "Disabled"}`, "success");
  };

  const commitName = () => {
    const name = nameInput.trim().slice(0, 24);
    if (!name) return;
    identity?.setDisplayName?.(name);
    identity?.commitName?.(name);
    setEditingName(false);
    addToast("Name updated", "success");
  };

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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-void/60 backdrop-blur-md"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        className="relative z-10 w-full sm:max-w-[520px] glass-card rounded-[var(--radius-panel)] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border-none"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border bg-white/[0.03]">
          <div>
            <h2 className="font-display font-bold text-xl text-bright">
              Settings
            </h2>
            <p className="text-[10px] font-mono mt-0.5 uppercase tracking-wider text-muted">
              {isHost ? "You are the host" : "Host controls only"}
            </p>
          </div>
          <Button
            variant="custom"
            onClick={onClose}
            className="!w-8 !h-8 flex items-center justify-center !rounded-[var(--radius-pill)] hover:!bg-white/10 transition-colors !text-white/60 hover:!text-white !p-0 !bg-transparent !border-none"
          >
            <XIcon className="w-4 h-4" strokeWidth={2.5} />
          </Button>
        </div>

        <div className="px-6 pb-6 max-h-[85vh] overflow-y-auto no-scrollbar">
          <SectionLabel>Profile</SectionLabel>
          <div className="mb-4">
            <div className="flex items-center gap-3">
              {editingName ? (
                <>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitName();
                      if (e.key === "Escape") {
                        setNameInput(identity?.displayName || "");
                        setEditingName(false);
                      }
                    }}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/90 text-sm outline-none focus:border-amber/40"
                    autoFocus
                    maxLength={24}
                  />
                  <Button
                    variant="custom"
                    onClick={commitName}
                    className="!w-8 !h-8 flex items-center justify-center !rounded-lg !bg-amber/20 !text-amber hover:!bg-amber/30 !p-0 !border-none"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex-1 flex items-center gap-2">
                    <User className="w-4 h-4 text-white/40" />
                    <span className="text-white/90 text-sm font-medium">
                      {identity?.displayName || "Guest"}
                    </span>
                  </div>
                  <Button
                    variant="custom"
                    onClick={() => {
                      setNameInput(identity?.displayName || "");
                      setEditingName(true);
                    }}
                    className="!w-8 !h-8 flex items-center justify-center !rounded-lg !text-white/40 hover:!text-amber hover:!bg-white/5 transition-colors !p-0 !bg-transparent !border-none"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>

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
          <Row
            label="Mirror my camera"
            description="Flip local video for selfie view"
            enabled={mirrorCameraEnabled}
            onToggle={() =>
              toggleAndToast(
                setMirrorCameraEnabled,
                "Mirror Camera",
                mirrorCameraEnabled,
              )
            }
            icon={<Camera className="w-4 h-4" />}
          />
          <Row
            label="Show sync hub"
            description="Floating play/pause control on player for host"
            enabled={syncHubEnabled}
            onToggle={() =>
              toggleAndToast(setSyncHubEnabled, "Sync Hub", syncHubEnabled)
            }
            disabled={!isHost}
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
                <Button
                  variant="custom"
                  onClick={() =>
                    setPwMode(
                      pwMode !== "idle"
                        ? "idle"
                        : hasPassword
                          ? "remove"
                          : "set",
                    )
                  }
                  className={`!text-[10px] !font-black !uppercase !tracking-wider !px-3 !py-1.5 !rounded-[var(--radius-pill)] !border transition-all !shrink-0
                    ${hasPassword ? "!bg-danger/10 !text-danger border-danger/20 hover:!bg-danger/20" : "!bg-jade/10 !text-jade border-jade/20 hover:!bg-jade/20"}`}
                >
                  {hasPassword ? "Remove" : "Set"}
                </Button>
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
                        className="w-full pr-10 bg-surface/40 border border-border rounded-[var(--radius-pill)] px-4 py-2 text-xs outline-none focus:border-amber/40 font-mono text-white/90 placeholder-white/30 transition-all"
                      />
                      <Button
                        variant="custom"
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 !text-white/40 hover:!text-white/80 transition-colors !p-1 !min-h-0 !border-none !bg-transparent"
                      >
                        {showPw ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <p className="flex-1 text-sm font-mono py-2 text-danger">
                      Remove room password?
                    </p>
                  )}
                  <Button
                    type="submit"
                    disabled={pwMode === "set" && !pwInput.trim()}
                    className="shrink-0 uppercase tracking-wider"
                  >
                    Confirm
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

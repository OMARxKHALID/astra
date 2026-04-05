"use client";

import {
  Monitor as TheatreIcon,
  List as EpisodesIcon,
  Cloud as ServerIcon,
  Lock as LockIcon,
  Play as PlayIcon,
} from "lucide-react";
import { serverOptions, detectServer } from "@/lib/videoResolver";
import { useState, useRef, useEffect } from "react";
import SyncHub from "../controls/SyncHub";
import PausedOverlay from "../controls/PausedOverlay";
import Button from "@/components/ui/Button";

// Extracts { current, duration } from provider-specific postMessage time formats.
function parseTimeMessage(data) {
  if (!data || typeof data !== "object") return null;

  if (
    data.type === "vidlink_time" &&
    data.time != null &&
    data.duration != null
  ) {
    return { current: data.time, duration: data.duration };
  }

  const isTimeEvent =
    data.event === "timeupdate" ||
    data.type === "timeupdate" ||
    data.event === "progress" ||
    data.type === "progress";

  if (isTimeEvent) {
    const current =
      data.currentTime ?? data.time ?? data.seconds ?? data.position;
    const duration = data.duration ?? data.total ?? data.length;
    if (current != null && duration != null && duration > 0) {
      return { current: Number(current), duration: Number(duration) };
    }
  }

  return null;
}

export default function EmbedPlayer({
  videoUrl,
  theatreMode,
  onToggleTheatre,
  hasEpisodes = false,
  onToggleEpisodes,
  onServerChange,
  onLoad,
  isHost = true,
  isRoom = false,
  syncHubEnabled = false,
  canControl = true,
  isPlaying,
  playbackRate = 1,
  onPlay,
  onPause,
  activeServer
}) {
  const containerRef = useRef(null);
  const [showServers, setShowServers] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const handleMessage = (e) => {
      const data = e.data;
      const parsed = parseTimeMessage(data);
      if (parsed && typeof onLoad === "function") {
        onLoad(videoUrl, null, parsed.duration);
      }
      if (data?.type === "vidlink_ready") {
        setReady(true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [videoUrl, onLoad]);

  // Sync isPlaying state to the iframe via postMessage
  useEffect(() => {
    const iframe = containerRef.current?.querySelector("iframe");
    if (!iframe?.contentWindow) return;

    if (isPlaying) {
      iframe.contentWindow.postMessage({ type: "vidlink_play" }, "*");
      try {
        iframe.contentWindow.postMessage(
          { type: "vidlink_speed", rate: playbackRate },
          "*",
        );
      } catch {}
    } else {
      iframe.contentWindow.postMessage({ type: "vidlink_pause" }, "*");
    }
  }, [isPlaying, ready, videoUrl, playbackRate]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-void flex flex-col group/embed overflow-hidden transition-all duration-700"
    >
      <div className="flex-1 relative" onClick={() => setShowServers(false)}>
        {(!isPlaying && syncHubEnabled) ? (
          <PausedOverlay 
            canControl={canControl} 
            onPlay={() => onPlay?.(0)} 
          />
        ) : (
          <iframe
            key={videoUrl}
            src={videoUrl}
            className="absolute inset-0 w-full h-full pointer-events-auto transition-opacity duration-700 animate-in fade-in"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
            referrerPolicy="no-referrer-when-downgrade"
            title="Embedded video player"
          />
        )}
      </div>

      {/* 2. MINIMAL SYNC HUB (Host Only) */}
      {isHost && isRoom && (
        <SyncHub
          isPlaying={isPlaying}
          onPlay={onPlay}
          onPause={onPause}
          visible={syncHubEnabled}
          className={`${!isPlaying ? "opacity-100 translate-y-0" : "opacity-0 group-hover/embed:opacity-100"}`}
        />
      )}

      {/* 3. ORIGINAL CONTROLS (Top Right) */}
      <div className="absolute top-4 right-4 z-20 flex gap-2 translate-y-2 opacity-0 group-hover/embed:translate-y-0 group-hover/embed:opacity-100 transition-all duration-500">
        {isHost && onServerChange && (
          <div className="relative group/servers">
            <Button
              variant="custom"
              onClick={() => setShowServers(!showServers)}
              title="Change Source"
              className={`!p-2.5 !rounded-[var(--radius-pill)] border transition-all cursor-pointer backdrop-blur-md shadow-2xl
                ${
                  showServers
                    ? "!bg-amber !text-void !border-amber shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                    : "!bg-void/80 !text-white/40 hover:!text-white hover:!bg-void !border-white/10"
                }`}
            >
              <ServerIcon className="w-4 h-4" />
            </Button>
            {showServers && (
              <div className="absolute top-full right-0 mt-3 w-48 glass-card border border-white/10 p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto overflow-hidden">
                <div className="px-3 py-2 border-b border-white/5 mb-1">
                  <p className="text-[10px] font-mono font-black text-white/30 uppercase tracking-widest">
                    Select Server
                  </p>
                </div>
                {serverOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    variant="custom"
                    onClick={() => {
                      onServerChange(opt.value);
                      setShowServers(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 !rounded-xl text-[10.5px] font-bold transition-all flex items-center justify-between !border-none !bg-transparent
                      ${
                        activeServer === opt.value
                          ? "!bg-amber/15 !text-white ring-1 ring-amber/10"
                          : "text-white/50 hover:!bg-white/10 hover:!text-white"
                      }`}
                  >
                    {opt.label}
                    {activeServer === opt.value && (
                      <div className="w-1 h-1 rounded-full bg-amber shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    )}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
        {isHost && hasEpisodes && onToggleEpisodes && (
          <Button
            variant="custom"
            onClick={() => {
              onToggleEpisodes();
              setShowServers(false);
            }}
            title="Browse Episodes"
            className="!p-2.5 !rounded-[var(--radius-pill)] !bg-void/80 !text-white/40 hover:!text-white hover:!bg-void !border !border-white/10 transition-all shadow-2xl"
          >
            <EpisodesIcon className="w-4 h-4" />
          </Button>
        )}
        {onToggleTheatre && (
          <Button
            variant="custom"
            onClick={() => {
              onToggleTheatre();
              setShowServers(false);
            }}
            title={theatreMode ? "Exit theatre mode" : "Theatre mode"}
            className={`!p-2.5 !rounded-[var(--radius-pill)] !border transition-all shadow-2xl
              ${
                theatreMode
                  ? "!bg-amber !text-void !border-amber shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                  : "!bg-void/80 !text-white/40 hover:!text-white hover:!bg-void !border-white/10"
              }`}
          >
            <TheatreIcon className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

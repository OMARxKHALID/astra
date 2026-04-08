"use client";

import {
  Monitor as TheatreIcon,
  List as EpisodesIcon,
  Cloud as ServerIcon,
} from "lucide-react";
import { detectServer } from "@/lib/videoResolver";
import { useState, useRef, useEffect } from "react";
import SyncHub from "../controls/SyncHub";
import PausedOverlay from "../controls/PausedOverlay";
import { ServerDropdown } from "../controls/ServerPicker";
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
}) {
  const containerRef = useRef(null);
  const [showServers, setShowServers] = useState(false);
  const [ready, setReady] = useState(false);

  const iframeOrigin = (() => {
    try { return new URL(videoUrl).origin; } catch { return null; }
  })();

  const activeServer = detectServer(videoUrl);

  useEffect(() => {
    const handleMessage = (e) => {
      if (iframeOrigin && e.origin !== iframeOrigin) return;
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
  }, [videoUrl, onLoad, iframeOrigin]);

  // Sync isPlaying state to the iframe via postMessage
  useEffect(() => {
    const iframe = containerRef.current?.querySelector("iframe");
    if (!iframe?.contentWindow || !iframeOrigin) return;

    if (isPlaying) {
      iframe.contentWindow.postMessage({ type: "vidlink_play" }, iframeOrigin);
      try {
        iframe.contentWindow.postMessage(
          { type: "vidlink_speed", rate: playbackRate },
          iframeOrigin,
        );
      } catch {}
    } else {
      iframe.contentWindow.postMessage({ type: "vidlink_pause" }, iframeOrigin);
    }
  }, [isPlaying, ready, videoUrl, playbackRate, iframeOrigin]);

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
        />
      )}

      {/* 3. ORIGINAL CONTROLS (Top Right) */}
      <div className="absolute top-4 right-4 z-[80] flex gap-2 translate-y-2 opacity-0 group-hover/embed:translate-y-0 group-hover/embed:opacity-100 transition-all duration-500">
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
              <ServerDropdown
                activeServer={activeServer}
                onServerChange={(v) => {
                  onServerChange(v);
                  setShowServers(false);
                }}
                visible={showServers}
              />
            )}
          </div>
        )}
        {isHost && isRoom && hasEpisodes && onToggleEpisodes && (
          <Button
            variant="custom"
            onClick={() => {
              onToggleEpisodes();
              setShowServers(false);
            }}
            title="Browse Episodes"
            className="episodes-toggle-btn !p-2.5 !rounded-[var(--radius-pill)] !bg-void/80 !text-white/40 hover:!text-white hover:!bg-void !border !border-white/10 transition-all shadow-2xl"
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

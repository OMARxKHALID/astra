"use client";

import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function CallGrid({
  isJoined,
  isJoining,
  localStream,
  remoteStreams,
  remoteStatus,
  displayNames,
  onLeave,
  onToggleMic,
  onToggleCam,
  micActive,
  camActive,
}) {
  const [pos, setPos] = useState({ x: 16, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const startRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const containerRef = useRef(null);

  const handleStart = (e) => {
    const clientX = e.type === "mousedown" ? e.clientX : e.touches[0].clientX;
    const clientY = e.type === "mousedown" ? e.clientY : e.touches[0].clientY;
    setIsDragging(true);
    startRef.current = {
      x: clientX,
      y: clientY,
      initialX: pos.x,
      initialY: pos.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e) => {
      if (!containerRef.current) return;
      const clientX = e.type === "mousemove" ? e.clientX : e.touches[0].clientX;
      const clientY = e.type === "mousemove" ? e.clientY : e.touches[0].clientY;
      const dx = startRef.current.x - clientX;
      const dy = startRef.current.y - clientY;
      let newX = startRef.current.initialX + dx;
      let newY = startRef.current.initialY + dy;
      const rect = containerRef.current.getBoundingClientRect();
      const safeMargin = 12;
      const maxX = window.innerWidth - rect.width - safeMargin;
      const maxY = window.innerHeight - rect.height - safeMargin;
      newX = Math.max(safeMargin, Math.min(newX, maxX));
      newY = Math.max(safeMargin, Math.min(newY, maxY));
      setPos({ x: newX, y: newY });
    };

    const handleEnd = () => setIsDragging(false);
    window.addEventListener("mousemove", handleMove, { passive: true });
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: true });
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging]);

  if (!isJoined && !isJoining) return null;

  return (
    <div
      ref={containerRef}
      className={`fixed z-50 flex flex-col gap-3 sm:gap-4 items-end pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${isDragging ? "transition-none" : ""}`}
      style={{
        bottom: `${pos.y}px`,
        right: `${pos.x}px`,
        transform: `scale(${isDragging ? 1.02 : 1})`,
        touchAction: "none",
      }}
    >
      <div className="flex flex-wrap justify-end gap-2 sm:gap-3 max-w-[95vw] sm:max-w-[800px] pointer-events-auto">
        {isJoined && (
          <VideoCircle
            stream={localStream}
            name="You"
            isLocal
            micActive={micActive}
            camActive={camActive}
          />
        )}

        {Object.entries(remoteStreams).map(([uid, stream]) => (
          <VideoCircle
            key={uid}
            stream={stream}
            name={displayNames[uid] || "Guest"}
            micActive={remoteStatus?.[uid]?.micActive !== false}
            camActive={remoteStatus?.[uid]?.camActive !== false}
          />
        ))}
      </div>

      <div
        className={`glass-card p-1.5 sm:px-3 sm:py-2 flex items-center gap-1.5 sm:gap-2 pointer-events-auto shadow-2xl rounded-full border border-white/10 transition-all ${isDragging ? "ring-2 ring-amber/40 bg-white/10" : "bg-white/5"}`}
      >
        <div
          onMouseDown={handleStart}
          onTouchStart={handleStart}
          className="w-7 h-8 sm:w-8 sm:h-9 flex items-center justify-center text-white/10 hover:text-white/30 cursor-grab active:cursor-grabbing transition-colors touch-manipulation"
        >
          <div className="flex flex-col gap-0.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 sm:w-3 h-0.5 bg-current rounded-full"
              />
            ))}
          </div>
        </div>

        <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

        {isJoining ? (
          <button className="h-8 sm:h-9 px-3 sm:px-4 rounded-full bg-white/5 border border-white/5 text-white/40 text-[9px] sm:text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
            <span className="hidden sm:inline">Connecting</span>
          </button>
        ) : (
          <>
            <ControlButton
              onClick={onToggleMic}
              active={micActive}
              Icon={micActive ? Mic : MicOff}
              color={micActive ? "text-white/80" : "text-danger"}
            />
            <ControlButton
              onClick={onToggleCam}
              active={camActive}
              Icon={camActive ? Video : VideoOff}
              color={camActive ? "text-white/80" : "text-danger"}
            />
            <button
              onClick={onLeave}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-danger/20 hover:bg-danger/30 flex items-center justify-center text-danger transition-all shadow-lg active:scale-90 touch-manipulation"
            >
              <PhoneOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function VideoCircle({ stream, name, isLocal, micActive, camActive }) {
  const videoRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const holdTimerRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [stream]);

  // [Note] Mobile hold-to-expand: 400ms touchstart timer mirrors desktop hover intent on touch devices
  const handleTouchStart = () => {
    holdTimerRef.current = setTimeout(() => setIsExpanded((v) => !v), 400);
  };
  const handleTouchEnd = () => {
    clearTimeout(holdTimerRef.current);
  };

  const showFallback = camActive === false;

  return (
    <div
      className={`glass-card relative overflow-hidden group shadow-2xl rounded-2xl sm:rounded-[var(--radius-panel)] border border-white/5 bg-void/60 transition-all duration-300 cursor-pointer touch-manipulation
        ${
          isExpanded
            ? "w-36 h-36 sm:w-56 sm:h-56 border-amber/30 shadow-[0_0_30px_rgba(245,158,11,0.15)]"
            : "w-20 h-20 sm:w-36 sm:h-36 hover:w-28 hover:h-28 sm:hover:w-48 sm:hover:h-48 hover:border-white/20"
        }`}
      onClick={() => setIsExpanded((v) => !v)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover transition-all duration-700 ${isLocal ? "scale-x-[-1]" : ""} ${showFallback ? "opacity-0 blur-xl scale-110" : "opacity-100 blur-0 scale-100"}`}
      />

      {showFallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-void/40 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-8 h-8 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber/30 to-amber-600/10 flex items-center justify-center border border-amber/20 text-amber font-mono font-black text-sm sm:text-2xl shadow-[0_0_25px_rgba(var(--color-amber-rgb),0.2)]">
            {name[0].toUpperCase()}
          </div>
        </div>
      )}

      <div className="absolute bottom-1.5 sm:bottom-3 left-1.5 sm:left-3 right-1.5 sm:right-3 flex items-center justify-between pointer-events-none">
        <div className="px-1.5 py-0.5 rounded-full bg-void/40 backdrop-blur-md border border-white/5 shrink-0 max-w-[85%]">
          <span className="text-[7px] sm:text-[9px] font-black text-white/60 uppercase tracking-widest truncate block">
            {name}
          </span>
        </div>
        {!micActive && (
          <div className="w-4 h-4 sm:w-7 sm:h-7 rounded-full bg-danger/20 backdrop-blur-md flex items-center justify-center border border-danger/20 shadow-lg">
            <MicOff className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-danger" />
          </div>
        )}
      </div>

      <div className="absolute inset-0 ring-1 ring-inset ring-white/5 group-hover:ring-white/10 transition-all pointer-events-none rounded-2xl sm:rounded-[var(--radius-panel)]" />
    </div>
  );
}

function ControlButton({ onClick, active, Icon, color }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full ${active ? "bg-white/5" : "bg-danger/10"} hover:bg-white/20 flex items-center justify-center transition-all active:scale-90 shadow-lg group shrink-0 touch-manipulation`}
    >
      <Icon
        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${color} transition-transform group-hover:scale-110`}
      />
      {!active && (
        <div className="absolute inset-0 rounded-full ring-1 ring-danger/40 animate-pulse pointer-events-none" />
      )}
    </button>
  );
}

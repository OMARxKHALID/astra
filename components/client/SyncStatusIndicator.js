"use client";

const STATUS_MAP = {
  connecting:   { dot: "bg-amber-400 animate-pulse", label: "CONNECTING", color: "text-amber-400" },
  reconnecting: { dot: "bg-danger animate-ping",    label: "RECONNECTING", color: "text-danger"    },
  connected:    { dot: "bg-jade shadow-[0_0_8px_rgba(16,185,129,0.5)]", label: "LIVE", color: "text-jade" },
};

const SYNC_MAP = {
  synced: { label: "SYNCED", color: "text-white/40" },
  soft:   { label: "ADJUSTING", color: "text-amber-400/60" },
  hard:   { label: "SYNCING", color: "text-danger/60" },
};

export default function SyncStatusIndicator({ syncStatus, connStatus }) {
  const isConnected = connStatus === "connected";
  const c = STATUS_MAP[connStatus] || STATUS_MAP.connecting;
  const s = SYNC_MAP[syncStatus] || SYNC_MAP.synced;

  return (
    <div className="flex items-center gap-3 select-none">
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-500 ${c.dot}`} />
        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${c.color}`}>
          {c.label}
        </span>
      </div>
      
      {isConnected && (
        <>
          <div className="w-px h-3 bg-white/10" />
          <span className={`text-[9px] font-mono uppercase tracking-[0.15em] font-medium ${s.color}`}>
            {s.label}
          </span>
        </>
      )}
    </div>
  );
}

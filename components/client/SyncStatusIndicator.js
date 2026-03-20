"use client";

const STATUS_CONFIG = {
  connecting:   { dot: "bg-amber-400 animate-pulse",  label: "Connecting",   color: "text-amber-400/70" },
  reconnecting: { dot: "bg-danger animate-ping",      label: "Reconnecting", color: "text-danger/70"    },
  connected:    null,
};

const SYNC_CONFIG = {
  synced: { dot: "bg-jade/70",              label: "Synced",    color: "text-jade/60"         },
  soft:   { dot: "bg-amber-400/80 animate-pulse", label: "Syncing", color: "text-amber-400/60" },
  hard:   { dot: "bg-danger/80 animate-pulse",    label: "Lagging", color: "text-danger/60"   },
};

export default function SyncStatusIndicator({ syncStatus, connStatus }) {
  const connCfg = connStatus !== "connected" ? STATUS_CONFIG[connStatus] : null;
  const syncCfg = SYNC_CONFIG[syncStatus] ?? SYNC_CONFIG.synced;
  const cfg     = connCfg ?? syncCfg;

  return (
    <div className="flex items-center gap-2" aria-label={`Status: ${cfg.label}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      <span className={`text-[10px] font-mono uppercase tracking-[0.2em] font-bold ${cfg.color}`}>
        {cfg.label}
      </span>
    </div>
  );
}

"use client";

import { STATUS_MAP, SYNC_MAP } from "@/constants/maps";

export default function SyncStatusIndicator({ syncStatus, connStatus }) {
  const isConnected = connStatus === "connected";
  const c = STATUS_MAP[connStatus] || STATUS_MAP.connecting;
  const s = SYNC_MAP[syncStatus] || SYNC_MAP.synced;

  return (
    <div className="flex items-center gap-3 select-none">
      <div className="flex items-center gap-2">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-500 ${c.dot}`}
        />
        <span
          className={`text-[10.5px] font-black uppercase tracking-[0.2em] hidden sm:inline ${c.color}`}
        >
          {c.label}
        </span>
      </div>

      {isConnected && (
        <>
          <div className="w-px h-3 bg-white/10 hidden md:block" />
          <span
            className={`text-[10.5px] font-mono uppercase tracking-[0.15em] font-medium hidden md:inline ${s.color}`}
          >
            {s.label}
          </span>
        </>
      )}
    </div>
  );
}

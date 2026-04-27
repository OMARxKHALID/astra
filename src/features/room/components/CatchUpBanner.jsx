"use client";

import { Button } from "@/components/ui/Button";

export function CatchUpBanner({ videoTS, onSync, onDismiss }) {
  const h = Math.floor(videoTS / 3600);
  const m = Math.floor((videoTS % 3600) / 60);
  const s = Math.floor(videoTS % 60);
  
  const fmt =
    h > 0
      ? `${h}h ${String(m).padStart(2, "0")}m`
      : m > 0
        ? `${m}m ${String(s).padStart(2, "0")}s`
        : `${s}s`;

  return (
    <div className="relative z-40 flex items-center gap-3 px-4 py-2 bg-amber/10 border-b border-amber/20 backdrop-blur-sm animate-in slide-in-from-top duration-500">
      <div className="w-2 h-2 rounded-full bg-amber animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
      <p className="flex-1 text-[12px] text-amber-200/90 font-mono font-bold leading-none">
        Room is already at {fmt} — click sync to catch up.
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="custom"
          onClick={onSync}
          className="!h-7 px-4 !rounded-full !bg-amber !text-void text-[10px] font-black uppercase tracking-wider hover:!bg-white transition-all"
        >
          Sync
        </Button>
        <Button
          variant="custom"
          onClick={onDismiss}
          className="!w-7 !h-7 !p-0 !text-amber/40 hover:!text-amber !bg-transparent !border-none !rounded-full transition-all"
        >
          ✕
        </Button>
      </div>
    </div>
  );
}

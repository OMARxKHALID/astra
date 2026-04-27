"use client";

import { Button } from "@/components/ui/Button";
import { serverOptions } from "@/lib/videoResolver";

export function ServerDropdown({
  activeServer,
  onServerChange,
  visible = false,
  className = "",
}) {
  if (!visible) return null;

  return (
    <div className={`absolute top-full right-0 mt-3 w-48 glass-card border border-white/10 p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 origin-top-right pointer-events-auto overflow-hidden ${className}`}>
      <div className="px-3 py-2 border-b border-white/5 mb-1">
        <p className="text-[10px] font-mono font-black text-white/30 uppercase tracking-widest">
          Select Server
        </p>
      </div>
      {serverOptions.map((opt) => (
        <Button
          key={opt.value}
          variant="custom"
          onClick={() => onServerChange?.(opt.value)}
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
  );
}

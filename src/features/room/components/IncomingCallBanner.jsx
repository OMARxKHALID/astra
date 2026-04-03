"use client";

import { Phone, PhoneOff, Video } from "lucide-react";

export function IncomingCallBanner({ 
  callerName = "Someone", 
  onAccept, 
  onDecline,
  visible 
}) {
  if (!visible) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-4 fade-in duration-300 w-[calc(100%-2rem)] sm:w-auto max-w-[350px]">
      <div className="glass-card flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-full border border-white/10 bg-void/95 backdrop-blur-xl">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber/20 flex items-center justify-center shrink-0 animate-pulse">
          <Video className="w-4 h-4 sm:w-5 sm:h-5 text-amber" />
        </div>
        
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-white/90 text-xs sm:text-sm font-bold truncate">
            {callerName}
          </span>
          <span className="text-white/40 text-[9px] sm:text-[10px]">
            Incoming call...
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onDecline}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-danger/20 hover:bg-danger/30 flex items-center justify-center text-danger transition-all active:scale-90 border border-danger/20"
          >
            <PhoneOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={onAccept}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-jade/20 hover:bg-jade/30 flex items-center justify-center text-jade transition-all active:scale-90 border border-jade/20"
          >
            <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { ls } from "@/utils/localStorage";

export default function PwaOnboarding() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      const dismissed = ls.get("astra_pwa_dismissed");
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      
      if (!dismissed && !isStandalone) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    ls.set("astra_pwa_dismissed", "true");
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 z-[100] md:left-auto md:max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative overflow-hidden group glass-card rounded-[var(--radius-panel)] shadow-[0_0_50px_-12px_rgba(245,158,11,0.3)] p-4">
        {/* [Note] Accent Glow: subtle atmospheric lighting to draw attention to installation */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber/10 blur-[50px] rounded-full group-hover:bg-amber/20 transition-all duration-700" />
        
        <div className="relative flex items-start gap-4">
          <div className="w-10 h-10 rounded-[var(--radius-pill)] bg-amber flex items-center justify-center shrink-0 shadow-lg shadow-amber/20">
            <Download className="w-5 h-5 text-void" strokeWidth={2.5} />
          </div>
          
          <div className="flex-1 min-w-0 pr-6">
            <h3 className="text-sm font-bold text-white tracking-tight leading-none mb-1.5 font-body">Install Astra App</h3>
            <p className="text-[11px] text-white/50 leading-relaxed font-body">Get the premium fullscreen experience and instant notifications.</p>
          </div>

          <button 
            onClick={handleDismiss}
            className="absolute -top-1 -right-1 w-7 h-7 flex items-center justify-center rounded-[var(--radius-pill)] text-white/20 hover:text-white/60 hover:bg-white/5 transition-all outline-none"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={handleInstall}
          className="mt-4 w-full h-10 rounded-[var(--radius-pill)] bg-amber text-void text-[11px] font-black uppercase tracking-[0.1em] hover:brightness-110 active:scale-95 transition-all shadow-md shadow-amber/10"
        >
          Install Now
        </button>
      </div>
    </div>
  );
}

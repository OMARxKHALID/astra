"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { ls } from "@/utils/localStorage";
import { LS_KEYS } from "@/constants/config";

export default function PwaOnboarding() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      const dismissed = ls.get(LS_KEYS.pwaDismissed);
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
    ls.set(LS_KEYS.pwaDismissed, "true");
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 z-[100] md:left-auto md:max-w-[320px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative overflow-hidden group bg-void/80 backdrop-blur-3xl border border-white/10 rounded-[var(--radius-panel)] p-5">
        <div className="relative flex items-start gap-4">
          <div className="w-10 h-10 rounded-[var(--radius-pill)] bg-amber flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-void" strokeWidth={2.5} />
          </div>
          
          <div className="flex-1 min-w-0 pr-6">
            <h3 className="text-sm font-bold text-white tracking-tight leading-none mb-1.5 font-body">Install Astra App</h3>
            <p className="text-[11px] text-white/50 leading-relaxed font-body">Get the premium fullscreen experience and instant notifications.</p>
          </div>

          <button 
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="absolute -top-1 -right-1 w-7 h-7 flex items-center justify-center rounded-[var(--radius-pill)] text-white/20 hover:text-white/60 hover:bg-white/5 transition-all outline-none"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <Button
          onClick={handleInstall}
          className="mt-4 w-full h-10 uppercase tracking-[0.1em]"
        >
          Install Now
        </Button>
      </div>
    </div>
  );
}

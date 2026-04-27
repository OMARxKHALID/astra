"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function BackButton({ 
  onClick, 
  href,
  className = "",
  icon: Icon = ChevronLeft,
}) {
  const router = useRouter();

  const handleBack = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleBack}
      aria-label="Go back"
      className={`w-10 h-10 rounded-full bg-black/20 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/40 transition-all active:scale-90 cursor-pointer group shrink-0 outline-none shadow-2xl focus-visible:ring-2 focus-visible:ring-amber/60 focus-visible:ring-offset-1 focus-visible:ring-offset-void touch-manipulation ${className}`}
    >
      <Icon className="w-5 h-5 pr-0.5 group-hover:-translate-x-0.5 transition-transform" />
    </button>
  );
}

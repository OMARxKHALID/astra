"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 p-6 animate-[fadeIn_0.5s_ease-out]">
      <div className="relative mb-4">
        <AlertTriangle className="w-16 h-16 text-danger/40" strokeWidth={1} />
        <div className="absolute inset-0 bg-danger/10 blur-2xl rounded-full" />
      </div>
      <h2 className="text-xl font-mono uppercase tracking-wider text-white/60 text-center">
        System Error
      </h2>
      <p className="text-sm text-white/40 text-center max-w-sm leading-relaxed mb-6">
        A critical error occurred while rendering this view. We have logged the issue.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <button onClick={() => reset()} className="btn-primary">
          Try Again
        </button>
        <Link 
          href="/" 
          className="glass-card flex items-center justify-center px-6 py-[0.6rem] text-sm font-bold text-white/70 hover:text-white transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}

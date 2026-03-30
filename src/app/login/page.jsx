"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const providers = [
  {
    id: "google",
    name: "Google",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    ),
    style: "bg-white hover:bg-gray-100 text-[#1f2937] border-white/20",
  },
  {
    id: "discord",
    name: "Discord",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
    style: "bg-[#5865F2] hover:bg-[#4752C4] text-white border-none shadow-md shadow-[#5865F2]/10",
  },
  {
    id: "github",
    name: "GitHub",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
    style: "bg-[#24292e] hover:bg-[#1b2126] text-white border-none shadow-md shadow-black/20",
  },
];

function LoginContent() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const error = params.get("error");

  return (
    <div className="min-h-[100dvh] bg-void flex items-center justify-center px-4 font-body overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber/5 rounded-full blur-[100px] sm:blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-jade/5 rounded-full blur-[100px] sm:blur-[120px]" />
      </div>

      <div className="w-full max-w-[380px] relative z-10 animate-in fade-in slide-in-from-top-6 duration-700">
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-[var(--radius-panel)] bg-amber flex items-center justify-center text-void font-black text-2xl mb-5 shadow-[0_8px_32px_rgba(var(--color-amber-rgb),0.3)] select-none transition-transform hover:scale-110 duration-500">
            A
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-bright font-display tracking-tight text-center leading-tight">
            Step into Astra
          </h1>
          <p className="text-sm text-white/40 mt-3 text-center max-w-[280px] leading-relaxed font-medium capitalize italic">
            Your personalized gate to movies, series, and social streaming.
          </p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-[13px] font-bold text-center animate-in fade-in duration-300">
            {error === "OAuthAccountNotLinked"
              ? "This email is already linked to another provider."
              : "Authentication failed. Please try again."}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => signIn(p.id, { callbackUrl })}
              className={`group w-full flex items-center justify-center gap-3 px-5 h-[48px] rounded-[var(--radius-pill)] ${p.style} font-bold text-[14px] transition-all active:scale-[0.98] shadow-lg cursor-pointer`}
            >
              <div className="transition-transform group-hover:scale-110 duration-200">
                {p.icon}
              </div>
              Continue with {p.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-[10px] text-white/20 font-mono uppercase tracking-[0.2em] font-bold">Options</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        <a
          href="/"
          className="block w-full text-center px-4 h-[48px] flex items-center justify-center rounded-[var(--radius-pill)] glass-card !bg-white/[0.03] text-white/60 font-bold text-[14px] hover:text-bright hover:!bg-white/5 transition-all no-underline active:scale-[0.98]"
        >
          Explore as Guest
        </a>

        <p className="text-[10px] text-white/10 text-center mt-12 leading-relaxed font-mono uppercase tracking-widest font-bold">
          Astra Global Protocol
          <br/>
          <span className="opacity-40">v1.2.5</span>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-void flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-[3px] border-amber/10 border-t-amber animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

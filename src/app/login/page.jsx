"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { DiscordIcon } from "@/components/icons/DiscordIcon";
import { GithubIcon } from "@/components/icons/GithubIcon";
import BackButton from "@/components/ui/BackButton";
import Button from "@/components/ui/Button";

const providers = [
  {
    id: "google",
    name: "Google",
    icon: <GoogleIcon />,
    style: "bg-white hover:bg-gray-100 text-void border-white/20",
  },
  {
    id: "discord",
    name: "Discord",
    icon: <DiscordIcon />,
    style:
      "bg-[#5865F2] hover:bg-[#4752C4] text-white border-none shadow-md shadow-[#5865F2]/10",
  },
  {
    id: "github",
    name: "GitHub",
    icon: <GithubIcon />,
    style:
      "bg-[#24292e] hover:bg-[#1b2126] text-white border-none shadow-md shadow-black/20",
  },
];

function LoginContent() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const error = params.get("error");

  return (
    <div className="min-h-[100dvh] bg-void flex items-center justify-center px-4 font-body overflow-hidden relative">
      <BackButton
        href="/"
        className="absolute top-6 left-6 lg:top-8 lg:left-10 z-[100]"
      />

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
            <Button
              key={p.id}
              variant="custom"
              size="lg"
              onClick={() => signIn(p.id, { callbackUrl })}
              className={`group w-full ${p.style} shadow-lg`}
            >
              <div className="transition-transform group-hover:scale-110 duration-200">
                {p.icon}
              </div>
              Continue with {p.name}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-[10px] text-white/20 font-mono uppercase tracking-[0.2em] font-bold">
            Options
          </span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        <Button href="/" variant="ghost" size="lg" className="w-full">
          Explore as Guest
        </Button>

        <p className="text-[10px] text-white/10 text-center mt-12 leading-relaxed font-mono uppercase tracking-widest font-bold">
          Astra Global Protocol
          <br />
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

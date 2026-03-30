"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import CreateRoomForm from "@/features/room/CreateRoomForm";

export default function CreateRoomPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-void font-body text-[var(--color-text)]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber/5 rounded-full blur-[150px]" />
      </div>

      <nav className="relative z-10 flex items-center gap-4 px-6 lg:px-12 h-[72px] bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={() => router.push("/")}
          aria-label="Go back home"
          className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-bright font-display">Create Room</h1>
      </nav>

      <div className="relative z-10 w-full max-w-[600px] mx-auto px-6 pt-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CreateRoomForm />
      </div>
    </div>
  );
}

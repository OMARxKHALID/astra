"use client";

import { useRouter } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import CreateRoomForm from "@/features/room/components/CreateRoomForm";

export const metadata = {
  title: "Create Room | Astra",
  description: "Astra is a real-time video synchronization platform for watch parties. Create a room and invite friends to sync streaming together.",
};

export default function CreateRoomPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-void font-body text-[var(--color-text)]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber/5 rounded-full blur-[150px]" />
      </div>

      <nav className="relative z-10 flex items-center gap-4 px-6 lg:px-12 h-[72px] bg-gradient-to-b from-black/60 to-transparent">
        <BackButton href="/" aria-label="Go back home" />
        <h1 className="text-lg font-bold text-bright font-display">
          Create Room
        </h1>
      </nav>

      <div className="relative z-10 w-full max-w-[600px] mx-auto px-6 pt-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CreateRoomForm />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import RecentRooms from "@/features/room/components/RecentRooms";
import UserMenu from "./UserMenu";

export default function HomeNavbar({ onOpenSearch }) {
  const router = useRouter();

  const [moving, setMoving] = useState(false);

  return (
    <nav className="absolute top-0 left-0 right-0 h-[72px] flex items-center justify-between px-6 lg:px-12 z-[100] bg-gradient-to-b from-black/80 to-transparent pt-4">
      <div className="flex items-center gap-[42px]">
        <h1 className="m-0 p-0 leading-none">
          <Button
            variant="custom"
            onClick={() => router.push("/")}
            className="text-xl font-bold font-display text-white tracking-[0.02em] flex items-center gap-2 !bg-transparent !border-none !p-0"
          >
            <div className="w-6 h-6 rounded-[var(--radius-pill)] bg-gradient-to-br from-amber to-amber-600 flex items-center justify-center text-void font-black text-sm">
              A
            </div>
            Astra
          </Button>
        </h1>
      </div>

      <div className="flex items-center gap-5">
        <Button
          variant="ghost"
          onClick={onOpenSearch}
          className="hidden lg:flex items-center gap-2.5 px-4 h-9 text-white/40 group !border-white/10"
        >
          <Search className="w-3.5 h-3.5 group-hover:text-amber transition-colors" />
          <span className="text-[12px] font-bold pr-1">Search…</span>
          <kbd className="hidden sm:flex items-center justify-center bg-white/10 border border-white/20 rounded px-1.5 h-[18px] text-[9px] font-black text-white/50 font-mono italic">
            ⌘K
          </kbd>
        </Button>

        <Button
          variant="ghost"
          onClick={onOpenSearch}
          className="lg:hidden !w-9 !h-9 !rounded-full text-white/40 !p-0 !border-white/10"
        >
          <Search className="w-4 h-4" />
        </Button>

        <RecentRooms />

        <UserMenu />

        <Button
          variant="ghost"
          loading={moving}
          disabled={moving}
          onClick={() => {
            setMoving(true);
            router.push("/create");
          }}
          className="flex items-center gap-2 px-5 h-9 text-white/80 !border-white/10"
        >
          {!moving && <Users className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">Create Room</span>
        </Button>
      </div>
    </nav>
  );
}

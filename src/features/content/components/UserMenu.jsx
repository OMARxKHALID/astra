"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LogOut, LogIn, Settings } from "lucide-react";
import Button from "@/components/ui/Button";

export default function UserMenu() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const [loading, setLoading] = useState(false);

  if (status === "loading") {
    return <div className="w-9 h-9 rounded-full bg-white/5 animate-pulse" />;
  }

  if (!session) {
    return (
      <Button
        variant="ghost"
        loading={loading}
        disabled={loading}
        onClick={() => {
          setLoading(true);
          router.push("/login");
        }}
        className="px-5 h-9 !bg-white/5 text-white/80 !border-white/10"
      >
        {!loading && <LogIn className="w-4 h-4" />}
        <span className="hidden sm:inline">Sign In</span>
      </Button>
    );
  }

  const user = session.user;

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="custom"
        onClick={() => setOpen(!open)}
        className={`w-9 h-9 !p-0 rounded-full overflow-hidden border transition-all cursor-pointer shadow-lg !bg-transparent
          ${open
            ? "!border-amber shadow-[0_0_24px_rgba(var(--color-amber-rgb),0.4)] scale-105"
            : "!border-white/10 hover:!border-white/30"
          }`}
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name || "User avatar"}
            width={36}
            height={36}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-void flex items-center justify-center text-amber font-bold text-sm">
            {(user.name || user.email || "U")[0].toUpperCase()}
          </div>
        )}
      </Button>

      {open && (
        <div className="absolute top-full right-0 mt-3 w-60 glass-card rounded-2xl overflow-hidden shadow-2xl z-50 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300 origin-top-right">
          <div className="px-4 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden p-[2px] bg-gradient-to-br from-amber to-amber/30 shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden bg-void">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name || "Avatar"}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-amber font-bold text-base font-display">
                      {(user.name || "U")[0].toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-bold text-bright truncate font-display">
                  {user.name || "Astra User"}
                </p>
                <p className="text-[11px] text-white/30 font-mono truncate">
                  {(user.email || "Free Tier").toLowerCase()}
                </p>
              </div>
            </div>
          </div>

          <div className="p-1.5 flex flex-col gap-0.5">
            <Button
              variant="custom"
              onClick={() => { setOpen(false); router.push("/profile"); }}
              className="w-full flex items-center gap-3 px-3 h-10 !rounded-xl text-[13px] font-bold text-white/60 hover:bg-white/10 hover:text-bright hover:pl-4 transition-all duration-300 !bg-transparent !border-none !justify-start group"
            >
              <Settings className="w-4 h-4 group-hover:text-amber transition-colors" />
              Profile Settings
            </Button>
            <Button
              variant="custom"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center gap-3 px-3 h-10 !rounded-xl text-[13px] font-bold text-danger/60 hover:bg-danger/10 hover:text-danger hover:pl-4 transition-all duration-300 !bg-transparent !border-none !justify-start group"
            >
              <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

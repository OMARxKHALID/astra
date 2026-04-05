"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  LogOut,
  ChevronLeft,
  Shield,
  Mail,
  User,
  Trash2,
  Database,
} from "lucide-react";
import BackButton from "@/components/ui/BackButton";
import { LS_KEYS } from "@/constants/config";

export default function ProfileView({ user }) {
  const router = useRouter();

  const handleClearData = () => {
    if (
      !window.confirm(
        "This will clear your room history, favorites, and local settings. Continue?",
      )
    )
      return;
    Object.values(LS_KEYS).forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  };

  const handleDeleteProfile = () => {
    if (
      !window.confirm(
        "Are you sure you want to delete your Astra profile? This will sign you out and wipe all local data.",
      )
    )
      return;
    Object.values(LS_KEYS).forEach((key) => localStorage.removeItem(key));
    signOut({ callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen bg-void font-body text-[var(--color-text)]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber/5 rounded-full blur-[150px]" />
      </div>

      <nav className="relative z-10 flex items-center gap-4 px-6 lg:px-12 h-[72px] bg-gradient-to-b from-black/60 to-transparent">
        <BackButton href="/" aria-label="Go back home" />
      </nav>

      <div className="relative z-10 max-w-[480px] mx-auto px-6 pt-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="glass-card rounded-[var(--radius-panel)] overflow-hidden">
          <div className="flex flex-col items-center pt-8 pb-6 px-6 bg-white/[0.02] border-b border-white/10">
            <div className="w-20 h-20 rounded-full overflow-hidden border-[3px] border-amber shadow-lg shadow-amber/20 mb-4 bg-void">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name || "Profile picture"}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-amber/20 flex items-center justify-center text-amber font-bold text-2xl font-display">
                  {(user.name || user.email || "U")[0].toUpperCase()}
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold text-bright font-display">
              {user.name || "Astra User"}
            </h2>
            <p className="text-sm text-white/40 font-mono mt-1">
              {(user.email || "").toLowerCase()}
            </p>
          </div>

          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[var(--radius-panel)] bg-amber/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-amber" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-white/30 font-mono uppercase tracking-widest">
                  Display Name
                </p>
                <p className="text-sm font-bold text-bright truncate">
                  {user.name || "Not set"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[var(--radius-panel)] bg-jade/10 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-jade" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-white/30 font-mono uppercase tracking-widest">
                  Email
                </p>
                <p className="text-sm font-bold text-bright truncate">
                  {(user.email || "").toLowerCase()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[var(--radius-panel)] bg-[#5865F2]/10 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-[#5865F2]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-white/30 font-mono uppercase tracking-widest">
                  Provider
                </p>
                <p className="text-sm font-bold text-bright capitalize">
                  {user.provider || "OAuth"}
                </p>
              </div>
            </div>

            <div className="w-full h-px bg-white/5 my-2" />

            <button
              onClick={handleClearData}
              className="w-full flex items-center gap-4 hover:bg-white/[0.03] p-2 -mx-2 rounded-[var(--radius-panel)] transition-colors group cursor-pointer border-none bg-transparent text-left outline-none"
            >
              <div className="w-10 h-10 rounded-[var(--radius-panel)] bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                <Database className="w-4 h-4 text-white/60 group-hover:text-bright" />
              </div>
              <div className="min-w-0 flex-1 transition-all duration-300 group-hover:pl-2">
                <p className="text-[13px] font-bold text-bright">
                  Clear App Data
                </p>
                <p className="text-[11px] text-white/40 mt-0.5">
                  Reset settings, rooms, and cache
                </p>
              </div>
            </button>

            <button
              onClick={handleDeleteProfile}
              className="w-full flex items-center gap-4 hover:bg-danger/5 p-2 -mx-2 rounded-[var(--radius-panel)] transition-colors group cursor-pointer border-none bg-transparent text-left outline-none"
            >
              <div className="w-10 h-10 rounded-[var(--radius-panel)] bg-danger/10 flex items-center justify-center shrink-0 group-hover:bg-danger/20 transition-colors">
                <Trash2 className="w-4 h-4 text-danger/80 group-hover:text-danger" />
              </div>
              <div className="min-w-0 flex-1 transition-all duration-300 group-hover:pl-2">
                <p className="text-[13px] font-bold text-danger">
                  Delete Profile
                </p>
                <p className="text-[11px] text-danger/60 mt-0.5">
                  Wipe data and sign out completely
                </p>
              </div>
            </button>
          </div>

          <div className="p-5 pt-0 mt-2">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-[var(--radius-pill)] bg-danger/10 border border-danger/20 text-danger font-bold text-[13px] hover:bg-danger/20 transition-all active:scale-[0.98] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

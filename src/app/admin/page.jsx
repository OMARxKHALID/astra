"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Users,
  Tv,
  RefreshCw,
  ShieldCheck,
  Globe,
  Youtube,
  Film,
  Subtitles,
  Lock,
  ArrowRight,
  Clock,
  Server,
  Zap,
} from "lucide-react";
import BackButton from "@/components/ui/BackButton";

function AdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stats, setStats] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [secretInput, setSecretInput] = useState("");

  const secretParam = searchParams.get("secret");

  useEffect(() => {
    const savedSecret = localStorage.getItem("astra_admin_secret");
    if (secretParam) {
      localStorage.setItem("astra_admin_secret", secretParam);
      setIsAuthorized(true);
      router.replace("/admin");
    } else if (savedSecret) {
      setIsAuthorized(true);
    }
  }, [secretParam, router]);

  const fetchStats = async () => {
    if (!isAuthorized) return;
    setLoading(true);
    setError(null);
    try {
      const secret = localStorage.getItem("astra_admin_secret");
      const res = await fetch("/api/admin/stats", {
        headers: { "x-admin-secret": secret || "" },
      });
      if (res.status === 401) {
        setIsAuthorized(false);
        setError("Unauthorized. Please verify your secret key.");
        return;
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to fetch stats");
      setStats(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchApiStatus = async () => {
    if (!isAuthorized) return;
    try {
      const secret = localStorage.getItem("astra_admin_secret");
      const res = await fetch("/api/admin/api-status", {
        headers: { "x-admin-secret": secret || "" },
      });
      if (res.status === 401) {
        setIsAuthorized(false);
        return;
      }
      const json = await res.json();
      if (json.success) setApiStatus(json.data);
    } catch (err) {
      console.error("Failed to fetch API status", err);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchStats();
      fetchApiStatus();
      const interval = setInterval(() => {
        fetchStats();
        fetchApiStatus();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthorized]);

  const formatUptime = (seconds) => {
    if (!seconds) return "0h 0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const formatTime = (ts) => {
    if (!ts) return "—";
    const diff = Date.now() - ts;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case "ok":
        return { label: "Online", dot: "bg-jade", text: "text-jade" };
      case "error":
        return { label: "Error", dot: "bg-danger", text: "text-danger" };
      case "timeout":
        return {
          label: "Slow",
          dot: "bg-amber animate-pulse",
          text: "text-amber",
        };
      case "not_configured":
        return { label: "Unset", dot: "bg-white/20", text: "text-white/30" };
      default:
        return { label: "Unknown", dot: "bg-white/20", text: "text-white/40" };
    }
  };
  if (!isAuthorized) {
    return (
      <div className="min-h-[100dvh] bg-void flex items-center justify-center px-4 font-body overflow-hidden">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-jade/5 rounded-full blur-[120px]" />
        </div>

        <div className="w-full max-w-[360px] relative z-10 animate-in fade-in slide-in-from-top-6 duration-700">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-[var(--radius-panel)] bg-amber flex items-center justify-center text-void font-black text-2xl mb-5 shadow-[0_8px_32px_rgba(245,158,11,0.3)] select-none">
              A
            </div>
            <h1 className="text-2xl font-bold text-bright font-display tracking-tight text-center">
              Admin Gateway
            </h1>
            <p className="text-sm text-white/40 mt-2 text-center max-w-[240px] leading-relaxed">
              Enter your secret key to access live telemetry.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (secretInput.trim()) {
                localStorage.setItem("astra_admin_secret", secretInput.trim());
                setIsAuthorized(true);
              } else {
                setError("Please enter a secret key");
              }
            }}
            className="flex flex-col gap-3"
          >
            <div className="relative">
              <input
                type="password"
                placeholder="Secret access key…"
                className="w-full h-[48px] bg-white/5 border border-white/10 rounded-[var(--radius-pill)] px-5 pr-14 text-[14px] outline-none focus:border-amber/40 focus:bg-white/8 transition-all text-white font-mono placeholder:text-white/20"
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 h-9 w-9 bg-amber text-void rounded-[var(--radius-pill)] flex items-center justify-center hover:bg-amber/90 active:scale-95 transition-all"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {error && (
              <p className="text-danger text-[12px] font-mono text-center">
                {error}
              </p>
            )}
          </form>

          <button
            onClick={() => router.push("/")}
            className="mt-8 w-full text-center text-[11px] text-white/20 hover:text-white/50 font-mono uppercase tracking-[0.2em] transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void font-body text-text">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-amber/4 rounded-full blur-[160px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-jade/4 rounded-full blur-[140px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 h-[72px] bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-5">
          <BackButton href="/" />
          
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2.5 text-white/50 hover:text-white transition-colors"
          >
            <div className="w-6 h-6 rounded-[var(--radius-pill)] bg-amber flex items-center justify-center text-void font-black text-sm">
              A
            </div>
            <span className="font-display font-bold text-lg tracking-tight">
              Astra
            </span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-[var(--radius-pill)] bg-amber/10 border border-amber/20">
            <div className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
            <span className="text-amber text-[10px] font-mono font-black uppercase tracking-[0.15em]">
              Live Telemetry
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">

          <button
            onClick={() => {
              fetchStats();
              fetchApiStatus();
            }}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-pill)] glass-card border-white/5 hover:border-white/15 transition-all active:scale-95 disabled:opacity-40"
          >
            <RefreshCw
              className={`w-4 h-4 text-white/50 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </nav>

      <main className="relative z-10 px-6 lg:px-12 pb-16 max-w-7xl mx-auto">
        <header className="pt-2 pb-10">
          <p className="text-[11px] font-mono text-white/25 uppercase tracking-[0.25em] mb-2">
            Instance Dashboard
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-black text-bright tracking-tight">
            Telemetry
          </h1>
        </header>

        {loading && !stats ? (
          <div className="flex flex-col items-center justify-center h-[40vh] gap-5">
            <div className="w-10 h-10 rounded-full border-2 border-amber/20 border-t-amber animate-spin" />
            <span className="text-white/20 text-[11px] font-mono uppercase tracking-[0.25em]">
              Syncing data…
            </span>
          </div>
        ) : (
          stats && (
            <div className="flex flex-col gap-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: "Active Rooms",
                    value: stats.rooms || 0,
                    icon: <Tv className="w-5 h-5" />,
                    accent: "amber",
                  },
                  {
                    label: "Live Users",
                    value: stats.users || 0,
                    icon: <Users className="w-5 h-5" />,
                    accent: "jade",
                  },
                  {
                    label: "Uptime",
                    value: formatUptime(stats.uptime),
                    icon: <Clock className="w-5 h-5" />,
                    accent: "white",
                  },
                  {
                    label: "Last Active",
                    value: formatTime(
                      stats.allRooms?.[0]?.lastUpdated || Date.now(),
                    ),
                    icon: <Zap className="w-5 h-5" />,
                    accent: "white",
                  },
                ].map((card, i) => (
                  <div
                    key={i}
                    className="glass-card p-6 flex flex-col gap-3 group cursor-default"
                  >
                    <div
                      className={`w-10 h-10 rounded-[var(--radius-panel)] flex items-center justify-center
                      ${card.accent === "amber" ? "bg-amber/10 text-amber" : ""}
                      ${card.accent === "jade" ? "bg-jade/10 text-jade" : ""}
                      ${card.accent === "white" ? "bg-white/5 text-white/30" : ""}
                    `}
                    >
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.15em] mb-1">
                        {card.label}
                      </p>
                      <p className="font-display text-3xl font-black text-bright group-hover:translate-x-0.5 transition-transform">
                        {card.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card overflow-hidden flex flex-col">
                  <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                    <div>
                      <h2 className="font-display text-xl font-bold text-bright">
                        Active Rooms
                      </h2>
                      <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.15em] mt-0.5">
                        Live sessions
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-[var(--radius-pill)] bg-white/5 border border-white/5 text-[11px] font-mono text-white/40">
                      {stats.allRooms?.length || 0} total
                    </span>
                  </div>

                  <div className="divide-y divide-white/[0.04]">
                    {stats.topRooms?.length > 0 ? (
                      stats.topRooms.map((room) => (
                        <div
                          key={room.roomId}
                          className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.025] transition-colors group"
                        >
                          <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-[var(--radius-panel)] bg-void border border-white/10 flex items-center justify-center font-mono font-black text-lg text-amber">
                              {room.participants}
                            </div>
                            {!room.isPaused && (
                              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-jade border-2 border-void animate-pulse" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-mono font-bold text-sm text-white/80">
                                {room.roomId}
                              </span>
                              {room.isPaused && (
                                <Lock className="w-3 h-3 text-white/30" />
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-white/25 truncate">
                              {room.video || "No media loaded"}
                            </p>
                          </div>

                          {/* Meta */}
                          <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                            <span
                              className={`text-[11px] font-bold font-mono ${
                                room.isPaused ? "text-white/30" : "text-jade"
                              }`}
                            >
                              {room.isPaused ? "Paused" : "Playing"}
                            </span>
                            <span className="text-[10px] font-mono text-white/25">
                              {formatTime(room.lastUpdated)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                        <Tv className="w-10 h-10 text-white/5" />
                        <p className="text-[12px] font-mono text-white/20 uppercase tracking-[0.2em]">
                          No active rooms
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-5">
                  <div className="glass-card overflow-hidden flex flex-col">
                    <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                      <h3 className="font-display text-lg font-bold text-bright">
                        API Status
                      </h3>
                      <Globe className="w-4 h-4 text-white/20" />
                    </div>

                    <div className="p-4 flex flex-col gap-2">
                      {[
                        {
                          id: "tmdb",
                          name: "The Movie DB",
                          icon: <Film className="w-4 h-4" />,
                        },
                        {
                          id: "youtube",
                          name: "YouTube",
                          icon: <Youtube className="w-4 h-4" />,
                        },
                        {
                          id: "opensubtitles",
                          name: "OpenSubtitles",
                          icon: <Subtitles className="w-4 h-4" />,
                        },
                      ].map((node) => {
                        const s = apiStatus?.[node.id];
                        const info = getStatusInfo(s?.status);
                        return (
                          <div
                            key={node.id}
                            className="flex items-center gap-3 p-3 rounded-[var(--radius-pill)] hover:bg-white/[0.03] transition-colors group"
                          >
                            <div className="text-white/20 group-hover:text-white/40 transition-colors shrink-0">
                              {node.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-bold text-white/60 leading-none mb-0.5">
                                {node.name}
                              </p>
                              <p className="text-[10px] font-mono text-white/25 truncate">
                                {s?.message || "Polling…"}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div
                                className={`w-2 h-2 rounded-full ${info.dot}`}
                              />
                              <span
                                className={`text-[10px] font-bold font-mono ${info.text}`}
                              >
                                {info.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="glass-card overflow-hidden">
                    <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                      <h3 className="font-display text-lg font-bold text-bright">
                        System
                      </h3>
                      <Server className="w-4 h-4 text-white/20" />
                    </div>
                    <div className="p-6 flex flex-col gap-4">
                      {[
                        {
                          label: "Environment",
                          value: "Production",
                          color: "text-jade",
                        },
                        {
                          label: "Storage",
                          value: "Upstash Redis",
                          color: "text-white/60",
                        },
                        { label: "Auth", value: "JWT", color: "text-white/60" },
                        {
                          label: "Transport",
                          value: "WSS + Polling",
                          color: "text-white/60",
                        },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between"
                        >
                          <span className="text-[11px] font-mono text-white/30 uppercase tracking-[0.1em]">
                            {row.label}
                          </span>
                          <span
                            className={`text-[12px] font-bold ${row.color}`}
                          >
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem("astra_admin_secret");
                      setIsAuthorized(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-[var(--radius-pill)] glass-card border-white/5 hover:border-danger/20 hover:bg-danger/5 text-white/30 hover:text-danger text-[12px] font-bold transition-all active:scale-95"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Revoke Access
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="bg-void h-screen" />}>
      <AdminContent />
    </Suspense>
  );
}

"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, Users, Loader2, Cloud, Check } from "lucide-react";
import Loading from "@/components/Loading";
import Image from "next/image";
import { serverOptions, buildEmbedUrl } from "@/lib/videoResolver";
import { createRoom } from "@/utils/createRoom";

import VideoPlayer from "@/features/video";
import { useRef } from "react";

function WatchContent() {
  const params = useSearchParams();
  const router = useRouter();
  const videoRef = useRef(null);

  const url = params.get("url") || "";
  const tmdbId = params.get("tmdb") || "";
  const type = params.get("type") || "movie";
  const s = params.get("s") || 1;
  const e = params.get("e") || 1;

  const [meta, setMeta] = useState(null);
  const [showBar, setShowBar] = useState(true);
  const [creating, setCreating] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const cloudRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cloudRef.current && !cloudRef.current.contains(event.target)) {
        setCloudOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  useEffect(() => {
    let timer;
    const reset = () => {
      setShowBar(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShowBar(false), 3000);
    };
    window.addEventListener("mousemove", reset);
    reset();
    return () => {
      window.removeEventListener("mousemove", reset);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!tmdbId) return;
    fetch(`/api/tmdb/${type}/${encodeURIComponent(tmdbId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setMeta(d);
      })
      .catch(() => {});
  }, [tmdbId, type]);

  if (!url) {
    return (
      <div className="h-dvh bg-[var(--color-void)] flex flex-col items-center justify-center gap-4">
        <p className="text-white/10 font-mono text-sm">
          No video URL provided.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-2.5 rounded-full bg-amber text-[var(--color-void)] font-bold text-sm cursor-pointer hover:bg-amber transition-all font-body active:scale-95"
        >
          Go Home
        </button>
      </div>
    );
  }

  const genres = (meta?.genres || []).slice(0, 3);

  return (
    <div className="h-dvh bg-void flex flex-col overflow-hidden relative">
      <div
        className={`fixed top-0 left-0 right-0 z-50 px-5 py-4 bg-gradient-to-b from-black/80 to-transparent flex items-center gap-3 transition-opacity duration-500 ${
          showBar ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 bg-white/10 border border-white/10 rounded-full px-4 py-1.5 text-white/10 cursor-pointer font-body text-[13px] font-medium hover:bg-white/10 transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {meta && (
          <div className="flex items-center gap-2.5 ml-1 animate-in fade-in slide-in-from-left-2 duration-700">
            {meta.poster && (
              <Image
                src={meta.poster}
                alt=""
                width={28}
                height={40}
                className="w-7 h-10 object-cover rounded-md shadow-lg border border-white/10"
              />
            )}
            <div className="flex flex-col">
              <p className="text-sm font-bold text-slate-50 font-display leading-tight">
                {meta.title}
              </p>
              <div className="flex gap-2 items-center mt-0.5">
                {meta.rating && (
                  <span className="text-[10px] text-amber font-mono flex items-center gap-1 font-bold">
                    <Star className="w-2.5 h-2.5 fill-amber" />{" "}
                    {meta.rating}
                  </span>
                )}
                {meta.year && (
                  <span className="text-[10px] text-white/10 font-mono">
                    {meta.year}
                  </span>
                )}
                <div className="flex gap-1.5">
                  {genres.map((g) => (
                    <span
                      key={g}
                      className="text-[9px] text-white/10 font-mono uppercase tracking-wider"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1" />

        <div className="flex items-stretch border border-amber/30 rounded-[var(--radius-pill)] bg-amber/15 transition-all">
          <button
            disabled={creating}
            onClick={async () => {
              setCreating(true);
              try {
                const { roomId } = await createRoom(url);
                router.push(
                  `/room/${roomId}?url=${encodeURIComponent(url)}&tmdb=${tmdbId}&type=${type}`,
                );
              } catch {
                setCreating(false);
              }
            }}
            className="flex items-center gap-2 px-4 py-1.5 text-amber cursor-pointer font-body text-[13px] font-bold hover:bg-amber/20 transition-all active:scale-[0.98] disabled:opacity-50 rounded-l-[var(--radius-pill)] h-full"
          >
            {creating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Users className="w-3.5 h-3.5" />
            )}
            Watch Together
          </button>
          
          <div className="relative flex items-stretch pointer-events-auto border-l border-amber/20" ref={cloudRef}>
            <button
              onClick={() => setCloudOpen(!cloudOpen)}
              className="px-3 py-1.5 text-amber cursor-pointer font-body hover:bg-amber/20 transition-all active:scale-[0.98] flex items-center justify-center rounded-r-[var(--radius-pill)] h-full"
              title="Change Server"
            >
              <Cloud className="w-3.5 h-3.5" strokeWidth={3} />
            </button>
            {cloudOpen && (
              <div className="absolute top-full right-0 mt-3 w-[160px] p-1.5 flex flex-col gap-0.5 rounded-xl border border-white/10 glass-card bg-void/90 backdrop-blur-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                <div className="px-2 py-1 mb-1 text-[8px] font-black text-[var(--color-muted)] uppercase tracking-wider font-mono">Select Provider</div>
                {serverOptions.map((opt) => {
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        const newUrl = buildEmbedUrl(opt.value, tmdbId, type, s, e);
                        setCloudOpen(false);
                        if (newUrl) {
                          router.replace(`/watch?url=${encodeURIComponent(newUrl)}&tmdb=${tmdbId}&type=${type}${type==='tv'?`&s=${s}&e=${e}`:''}`);
                        }
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-md text-[10px] font-bold tracking-wide transition-colors flex items-center justify-between text-white/10 hover:bg-white/10 hover:text-white`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 relative bg-void">
        <VideoPlayer
          videoRef={videoRef}
          videoUrl={url}
          isHost={true}
          isPlaying={true}
        />
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<Loading />}>
      <WatchContent />
    </Suspense>
  );
}

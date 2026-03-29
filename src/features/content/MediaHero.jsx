"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Play, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { GENRE_MAP } from "@/constants/maps";

export default function MediaHero({ items, onPick, onPlay }) {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const timer = useRef(null);

  const go = useCallback((next) => {
    setFading(true);
    setTimeout(() => {
      setIdx(typeof next === "function" ? next : next);
      setFading(false);
    }, 260);
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    timer.current = setInterval(
      () => go((i) => (i + 1) % items.length),
      8000,
    );
    return () => clearInterval(timer.current);
  }, [items.length, go]);

  if (!items.length) return <div className="h-[750px] bg-[var(--color-void)]" />;

  const item = items[idx];
  const genres = (item.genreIds || [])
    .slice(0, 3)
    .map((id) => GENRE_MAP[id])
    .filter(Boolean);

  return (
    <div className="relative h-[750px] overflow-hidden group">
      {item.backdrop && (
        <Image
          src={item.backdrop}
          alt=""
          fill
          priority
          sizes="100vw"
          className={`object-cover object-[center_25%] transition-opacity duration-[260ms] ease-in-out ${fading ? "opacity-0" : "opacity-100"}`}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-void)] via-[var(--color-void)]/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-void)] to-transparent" />

      <div
        className={`absolute inset-0 flex items-end px-6 lg:px-12 pb-[120px] transition-opacity duration-[260ms] ease-in-out ${fading ? "opacity-0" : "opacity-100"}`}
      >
        <div className="max-w-[520px] z-10">
          <div className="flex gap-2 mb-4 items-center flex-wrap">
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-[20px] uppercase tracking-[0.12em] font-mono border ${item.type === "tv" ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : "bg-transparent text-white/70 border-white/20"}`}
            >
              {item.type === "tv" ? "Series" : "Movie"}
            </span>
            {item.rating && (
              <span className="text-[11px] px-2 py-0.5 rounded-[var(--radius-pill)] bg-black/40 text-amber-500 font-mono flex items-center gap-[3px] font-bold">
                <Star className="w-[10px] h-[10px] fill-amber-500" />
                {item.rating}
              </span>
            )}
            {item.year && (
              <span className="text-[11px] text-white/35 font-mono">
                {item.year}
              </span>
            )}
            {genres.map((g) => (
              <span
                key={g}
                className="text-[10px] text-white/40 font-mono uppercase tracking-widest"
              >
                · {g}
              </span>
            ))}
          </div>

          <h1 className="font-display text-[54px] font-bold text-slate-50 leading-none mb-4 tracking-tight">
            {item.title}
          </h1>

          <p className="text-sm text-white/50 leading-relaxed mb-7 line-clamp-3 font-body">
            {item.overview}
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => onPlay && onPlay(item)}
              className="flex items-center gap-2 px-7 py-3 rounded-[var(--radius-pill)] bg-amber-500 text-[var(--color-void)] font-bold text-sm border-none cursor-pointer hover:bg-amber-400 transition-all font-body shadow-[0_4px_16px_rgba(245,158,11,0.2)] active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              Play
            </button>
            <button
              onClick={() => onPick(item)}
              className="flex items-center gap-2 px-5 py-3 rounded-[var(--radius-pill)] bg-white/5 text-white/80 font-medium text-sm cursor-pointer border border-white/10 hover:bg-white/10 transition-all font-body active:scale-95"
            >
              See More
            </button>
          </div>
        </div>
      </div>

      {items.length > 1 && (
        <div className="absolute bottom-[100px] right-6 lg:right-12 flex gap-1.5 items-center z-20">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className={`h-1.5 rounded-[var(--radius-pill)] border-none cursor-pointer transition-all duration-300 p-0 ${i === idx ? "w-[22px] bg-amber-500" : "w-1.5 bg-white/20"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

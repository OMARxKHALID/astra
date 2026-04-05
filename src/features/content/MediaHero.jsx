"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Play, Star } from "lucide-react";
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
    timer.current = setInterval(() => go((i) => (i + 1) % items.length), 8000);
    return () => clearInterval(timer.current);
  }, [items.length, go]);

  if (!items.length) return <div className="h-[750px] bg-void" />;

  const item = items[idx];
  const genres = (item.genreIds || [])
    .slice(0, 3)
    .map((id) => GENRE_MAP[id])
    .filter(Boolean);

  return (
    <div className="relative h-[750px] overflow-hidden group z-0">
      {item.backdrop && (
        <Image
          src={item.backdrop}
          alt={`${item.title} backdrop`}
          fill
          priority
          sizes="100vw"
          className={`object-cover object-[center_25%] transition-opacity duration-[260ms] ease-in-out ${fading ? "opacity-0" : "opacity-100"}`}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-void via-void/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-void to-transparent" />

      <div
        className={`absolute inset-0 flex items-end px-6 lg:px-12 pb-[120px] transition-opacity duration-[260ms] ease-in-out ${fading ? "opacity-0" : "opacity-100"}`}
      >
        <div className="max-w-[520px] z-10">
          <div className="flex gap-2 mb-4 items-center flex-wrap">
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-[var(--radius-pill)] uppercase tracking-[0.12em] font-mono border ${
                item.isAnime
                  ? "bg-danger/15 text-danger border-danger/30"
                  : item.type === "tv"
                    ? "bg-jade/15 text-jade border-jade/30"
                    : "bg-transparent text-white/40 border-white/10"
              }`}
            >
              {item.isAnime ? "Anime" : item.type === "tv" ? "Series" : "Movie"}
            </span>
            {item.rating && (
              <span className="text-[11px] px-2 py-0.5 rounded-[var(--radius-pill)] bg-void/40 text-amber font-mono flex items-center gap-[3px] font-bold">
                <Star className="w-[10px] h-[10px] fill-amber" />
                {item.rating}
              </span>
            )}
            {item.year && (
              <span className="text-[11px] text-white/40 font-mono">
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

          <h1 className="font-display text-[2.5rem] md:text-[3.4rem] lg:text-[54px] font-bold text-bright leading-none mb-4 tracking-tight">
            {item.title}
          </h1>

          <p className="text-sm text-white/60 leading-relaxed mb-7 line-clamp-3 font-body">
            {item.overview}
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => onPlay && onPlay(item)}
              aria-label={`Watch ${item.title}`}
              className="flex items-center gap-2 px-7 py-3 rounded-[var(--radius-pill)] bg-amber text-void font-bold text-sm border-none cursor-pointer hover:bg-amber transition-all font-body shadow-lg active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              Play
            </button>
            <button
              onClick={() => onPick(item)}
              aria-label={`View details for ${item.title}`}
              className="flex items-center gap-2 px-6 py-3 rounded-[var(--radius-pill)] bg-white/5 backdrop-blur-xl text-white/80 font-bold text-sm cursor-pointer border border-white/10 hover:bg-white/10 hover:text-white transition-all font-body active:scale-95"
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
              className={`h-1.5 rounded-[var(--radius-pill)] border-none cursor-pointer transition-all duration-300 p-0 ${i === idx ? "w-[22px] bg-amber" : "w-1.5 bg-white/10"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

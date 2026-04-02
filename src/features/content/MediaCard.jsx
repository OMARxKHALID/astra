"use client";
import Image from "next/image";
import { Film, Play, Star } from "lucide-react";

export default function MediaCard({ item, onPick }) {
  return (
    <button
      onClick={() => onPick(item)}
      className="shrink-0 w-[160px] bg-transparent border-none p-0 text-left cursor-pointer group outline-none"
    >
      <div className="w-[160px] h-[240px] rounded-[1rem] overflow-hidden bg-[var(--color-surface)] relative transition-transform duration-200 group-hover:scale-105 shadow-lg">
        {item.poster ? (
          <Image
            src={item.poster}
            alt={item.title}
            width={160}
            height={240}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-7 h-7 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-void/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center">
          <div className="w-12 h-12 rounded-[var(--radius-pill)] bg-amber flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 fill-[var(--color-void)] text-[var(--color-void)] ml-1" />
          </div>
        </div>
        {item.rating && (
          <div className="absolute top-2 right-2 bg-void/80 px-1.5 py-0.5 rounded-md text-[11px] font-bold text-amber font-mono flex items-center gap-1 shadow-md">
            <Star className="w-2.5 h-2.5 fill-current" />
            {item.rating}
          </div>
        )}
        {item.type && (
          <div
            className={`absolute top-2 left-2 px-2 py-0.5 border rounded-full text-[9px] font-bold font-mono uppercase tracking-wider shadow-md backdrop-blur-sm ${
              item.isAnime
                ? "bg-danger/20 border-danger/30 text-danger"
                : item.type === "tv"
                  ? "bg-jade/20 border-jade/30 text-jade"
                  : "bg-amber/20 border-amber/30 text-amber"
            }`}
          >
            {item.isAnime ? "Anime" : item.type === "tv" ? "Series" : "Movie"}
          </div>
        )}
      </div>
      <p className="text-[11px] font-bold mt-2 text-dim leading-snug line-clamp-2 font-display group-hover:text-white transition-colors">
        {item.title}
      </p>
    </button>
  );
}

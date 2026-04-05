"use client";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MediaCard from "./MediaCard";

export default function MediaRow({
  title,
  items,
  onPick,
  accent = "var(--color-amber)",
}) {
  const ref = useRef(null);
  const scroll = (d) =>
    ref.current?.scrollBy({ left: d * 680, behavior: "smooth" });

  return (
    <div>
      <div className="flex items-center justify-between mb-4 px-6 lg:px-12">
        <h2 className="text-lg font-bold text-[var(--color-bright)] font-display flex items-center gap-2.5">
          <span
            className="w-[3px] h-5 rounded-full"
            style={{ background: accent }}
          />
          {title}
        </h2>
        <div className="flex gap-[5px]">
          {[-1, 1].map((d) => (
            <button
              key={d}
              onClick={() => scroll(d)}
              className="w-[30px] h-[30px] rounded-[var(--radius-pill)] bg-white/10 border-none text-[var(--color-muted)] cursor-pointer flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
            >
              {d < 0 ? (
                <ChevronLeft className="w-[15px] h-[15px]" />
              ) : (
                <ChevronRight className="w-[15px] h-[15px]" />
              )}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto scrollbar-none pt-4 -mt-4 pb-4 px-6 lg:px-12"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((item) => (
          <MediaCard key={item.id} item={item} onPick={onPick} />
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export default function CustomSelect({
  label,
  value,
  options,
  onChange,
  icon: Icon = ChevronDown,
  position = "bottom",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options?.find((opt) => opt.value === value) ||
    options?.[0] || { label: "Select...", value: "" };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-2 w-full" ref={containerRef}>
      {label && (
        <label className="text-[9px] font-black text-[var(--color-muted)] uppercase tracking-[0.2em] ml-2">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-5 h-10 rounded-[var(--radius-pill)] border transition-all duration-300 glass-card shadow-lg bg-[var(--color-surface)] hover:border-white/20 group ${
            isOpen
              ? "border-amber ring-2 ring-amber/10 shadow-amber/5 z-[50]"
              : "border-[var(--color-border)] z-[1]"
          }`}
        >
          <span className="text-[11px] lg:text-[12px] font-bold text-[var(--color-text)] truncate pr-4">
            {selectedOption.label}
          </span>
          <Icon
            className={`w-3.5 h-3.5 text-[var(--color-muted)] transition-transform duration-300 ${isOpen ? "rotate-180 text-amber" : "group-hover:text-amber"}`}
          />
        </button>

        {isOpen && (
          <div
            className={`absolute ${position === "top" ? "bottom-full mb-2" : "top-full mt-2"} left-0 right-0 z-[100] glass-card border border-white/10 rounded-[1.25rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 ${position === "top" ? "slide-in-from-bottom-2" : "slide-in-from-top-2"} duration-200 p-1.5 backdrop-blur-2xl bg-[var(--color-surface)]/95`}
          >
            <div className="max-h-[240px] overflow-y-auto no-scrollbar flex flex-col gap-0.5">
              {options.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[0.85rem] text-[11px] lg:text-[12px] font-bold transition-all duration-200 group/item ${
                    opt.value === value
                      ? "bg-amber text-void shadow-lg shadow-amber/10"
                      : "text-[var(--color-muted)] hover:bg-white/10 hover:text-bright"
                  }`}
                >
                  <span className="truncate pr-4">{opt.label}</span>
                  {opt.value === value && (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

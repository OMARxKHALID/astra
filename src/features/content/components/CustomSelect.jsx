"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import Button from "@/components/ui/Button";

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
    <div className="flex flex-col gap-1.5 w-full" ref={containerRef}>
      {label && (
        <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-[0.25em] ml-4 mb-0.5">
          {label}
        </label>
      )}
      <div className="relative">
        <Button
          variant="custom"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-5 h-12 rounded-[var(--radius-pill)] border transition-all duration-300 glass-card bg-[var(--color-surface)]/20 hover:bg-white/5 group ${
            isOpen
              ? "border-amber ring-4 ring-amber/5 !bg-white/5 z-[50]"
              : "border-white/5 z-[1]"
          }`}
        >
          <span className="text-[13px] font-bold text-[var(--color-text)] truncate pr-4">
            {selectedOption.label}
          </span>
          <div className={`p-1 rounded-full transition-all duration-300 ${isOpen ? "bg-amber/10 text-amber" : "bg-white/5 text-[var(--color-muted)] group-hover:text-amber group-hover:bg-amber/5"}`}>
            <Icon
              className={`w-3.5 h-3.5 transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isOpen ? "rotate-180" : ""}`}
            />
          </div>
        </Button>

        {isOpen && (
          <div
            className={`absolute ${position === "top" ? "bottom-full mb-3" : "top-full mt-3"} left-0 right-0 z-[100] glass-card border border-white/10 rounded-[var(--radius-panel)] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 ${position === "top" ? "slide-in-from-bottom-3" : "slide-in-from-top-3"} duration-300 p-2.5 backdrop-blur-3xl bg-void/95`}
          >
            <div className="max-h-[280px] overflow-y-auto thin-scrollbar flex flex-col gap-1.5 pr-1">
              {options.map((opt) => (
                <Button
                  variant="custom"
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-[1.25rem] text-[13px] font-bold transition-all duration-200 group/item border ${
                    opt.value === value
                      ? "bg-amber text-void border-amber shadow-lg shadow-amber/10"
                      : "text-white/40 border-transparent hover:bg-white/5 hover:text-white hover:border-white/5"
                  }`}
                >
                  <span className="truncate pr-4">{opt.label}</span>
                  {opt.value === value ? (
                    <Check className="w-4 h-4 shrink-0" strokeWidth={3} />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-white/10 group-hover/item:border-white/20 transition-colors" />
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("wt_theme") || "dark";
    setTheme(stored);
    // Ensure the attribute is set (layout script may not have run on first load)
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("wt_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  // Don't render until mounted — prevents SSR/client hydration mismatch
  // and ensures icon reflects the actual stored preference
  if (!mounted) {
    return <div className={`w-9 h-9 rounded-[2rem] glass-card ${className}`} />;
  }

  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
      className={`w-9 h-9 flex items-center justify-center rounded-[2rem] glass-card
                  text-muted hover:text-white/80 transition-all active:scale-95 ${className}`}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4" strokeWidth={1.75} />
      ) : (
        <Moon className="w-4 h-4" strokeWidth={1.75} />
      )}
    </button>
  );
}

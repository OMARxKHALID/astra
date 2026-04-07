import React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function Button({
  children,
  onClick,
  href,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  loading = false,
  type = "button",
  ...props
}) {
  const baseClasses =
    "flex items-center justify-center gap-1.5 font-black cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none outline-none select-none rounded-[var(--radius-pill)] whitespace-nowrap";

  const sizeClasses = {
    sm: "h-8 px-3 text-[11px]",
    md: "h-9 px-4 text-[12px]",
    lg: "h-[48px] px-5 gap-3 text-[14px]",
  };

  const variantClasses = {
    primary:
      "bg-amber text-void shadow-[0_4px_12px_rgba(var(--color-amber-rgb),0.3)] hover:brightness-110 border border-amber",
    jade: "bg-jade text-void shadow-[0_4px_12px_rgba(var(--color-jade-rgb),0.3)] hover:brightness-110 border border-jade",
    ghost: "glass-card !bg-white/5 border border-white/10 text-white/80 hover:!bg-white/10 hover:text-white",
    ghostActive: "bg-amber text-void shadow-[0_4px_12px_rgba(var(--color-amber-rgb),0.3)] hover:brightness-110 border border-amber",
    danger:
      "glass-card border border-white/5 hover:border-danger/20 hover:bg-danger/5 text-white/30 hover:text-danger",
    alert:
      "bg-danger/10 border border-danger/20 text-danger hover:bg-danger/20",
    custom: "", // allows passing pure tailwind styling in className
  };

  const classes = `${baseClasses} ${sizeClasses[size] || sizeClasses.md} ${variantClasses[variant] ?? variantClasses.primary} ${className}`;

  const content = (
    <>
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
      {!loading && children}
    </>
  );

  if (href) {
    // Determine if it should be an anchor tag or next/link
    const isExternal = href.startsWith("http") || href.startsWith("mailto");
    if (isExternal) {
      return (
        <a
          href={href}
          className={classes}
          target="_blank"
          rel="noopener noreferrer"
        >
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
      {...props}
    >
      {content}
    </button>
  );
}

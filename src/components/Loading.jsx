"use client";

export default function Loading({ full = true, size = "md" }) {
  const sizeClasses = {
    sm: "w-5 h-5 border-2",
    md: "w-9 h-9 border-[3px]",
    lg: "w-12 h-12 border-4",
    xl: "w-14 h-14 border-2 shadow-[0_0_20px_rgba(245,158,11,0.12)]",
  };

  const container = (
    <div className="flex items-center justify-center p-8">
      <div 
        className={`${sizeClasses[size] || sizeClasses.md} rounded-full border-amber/20 border-t-amber animate-spin`} 
      />
    </div>
  );

  if (full) {
    return (
      <div className="h-dvh w-full bg-[var(--color-void)] flex items-center justify-center">
        {container}
      </div>
    );
  }

  return container;
}

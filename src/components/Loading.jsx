"use client";

export default function Loading({ full = true, size = "md" }) {
  const sizeClasses = {
    sm: "w-5 h-5 border-2",
    md: "w-9 h-9 border-[3px]",
    lg: "w-12 h-12 border-4",
  };

  const container = (
    <div className="flex items-center justify-center p-8">
      <div 
        className={`${sizeClasses[size] || sizeClasses.md} rounded-full border-amber-500/15 border-t-amber-500 animate-spin`} 
      />
    </div>
  );

  if (full) {
    return (
      <div className="h-screen w-full bg-[var(--color-void)] flex items-center justify-center">
        {container}
      </div>
    );
  }

  return container;
}

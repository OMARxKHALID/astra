"use client";

export function NotificationCard({
  label,
  message,
  progress,
  duration,
  icon,
  children,
  className = "",
  progressBarColor = "bg-amber",
}) {
  return (
    <div
      className={`w-[230px] glass-card border border-white/10 rounded-xl overflow-hidden shadow-2xl ${className}`}
    >
      <div className="h-[1.5px] bg-white/5 relative">
        <div
          className={`absolute inset-y-0 right-0 ${progressBarColor} transition-all duration-1000 ease-linear fill-mode-forwards`}
          style={{
            width: progress != null ? `${progress}%` : undefined,
            animation:
              duration != null
                ? `notificationProgress ${duration}ms linear forwards`
                : undefined,
          }}
        />
      </div>

      <div className="px-3 py-2.5 flex items-start gap-2.5">
        {icon && (
          <div className="mt-0.5 w-5 h-5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {label && (
            <p className="text-[8px] font-mono font-black text-white/30 uppercase tracking-[0.2em] mb-0.5">
              {label}
            </p>
          )}
          {message && (
            <p className="text-[12px] font-medium text-white/90 leading-snug">
              {message}
            </p>
          )}
          {children}
        </div>
      </div>

      <style jsx global>{`
        @keyframes notificationProgress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

"use client";

/**
 * ThumbnailPoster
 *
 * Shown inside a player container before the video is ready to play.
 * Renders a blurred thumbnail background (if available) with a centred
 * glassmorphic "Ready to Sync" card on top.
 */
export default function ThumbnailPoster({
  visible,
  thumbnailUrl = null,
  title = null,
  subtitle = "Connecting…",
}) {
  return (
    <div
      className={`absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-500 pointer-events-none
        ${visible ? "opacity-100" : "opacity-0"}`}
      aria-hidden={!visible}
    >
      {thumbnailUrl ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${thumbnailUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(48px) brightness(0.25) saturate(1.4)",
            transform: "scale(1.12)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-void via-surface to-void" />
      )}

      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 flex flex-col items-center gap-3 text-center px-6 py-5 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl max-w-xs">
        <div className="w-12 h-12 rounded-[1.5rem] bg-amber-500/12 border border-amber-500/25 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-amber-500/70"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="2" y1="7" x2="7" y2="7" />
            <line x1="2" y1="17" x2="7" y2="17" />
            <line x1="17" y1="17" x2="22" y2="17" />
            <line x1="17" y1="7" x2="22" y2="7" />
          </svg>
        </div>

        <div>
          {title && (
            <p className="text-sm font-display font-bold text-white/85 leading-tight max-w-[220px] line-clamp-2 mb-0.5">
              {title}
            </p>
          )}
          <p className="text-[11px] font-mono text-muted/80 uppercase tracking-widest">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="w-1 h-1 rounded-full bg-amber-500/50 animate-pulse"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

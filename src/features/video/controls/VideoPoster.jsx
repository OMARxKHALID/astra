"use client";

// [Note] Blurred thumbnail placeholder shown while the player connects/buffers
export default function VideoPoster({
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

      <div className="absolute inset-0 bg-void/40" />

      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        {subtitle !== "" && (
          <div className="w-14 h-14 rounded-full border-2 border-amber/20 border-t-amber animate-spin shadow-[0_0_30px_rgba(var(--color-amber-rgb), 0.2)]" />
        )}
      </div>
    </div>
  );
}

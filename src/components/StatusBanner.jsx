"use client";

export default function StatusBanner({ connStatus }) {
  if (connStatus === "connected") return null;

  const isConnecting = connStatus === "connecting";
  const isReconnecting = connStatus === "reconnecting";

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`relative z-50 flex items-center justify-center gap-3 py-2.5 text-xs font-mono font-bold uppercase tracking-widest
        transition-all duration-300
        ${
          isReconnecting
            ? "bg-danger/15 text-danger border-b border-danger/20"
            : "bg-amber/12 text-amber border-b border-amber/20"
        }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${isReconnecting ? "bg-danger animate-pulse" : "bg-amber animate-spin"}`}
        style={isConnecting ? { borderRadius: "2px" } : undefined}
      />
      {isReconnecting
        ? "Connection lost — reconnecting…"
        : "Connecting to room…"}
    </div>
  );
}

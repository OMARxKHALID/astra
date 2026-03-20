import CreateRoomForm from "@/components/client/CreateRoomForm";

export const metadata = {
  title: "WatchTogether — Watch videos in sync",
  description:
    "Create a private room, share the link, watch any video in perfect real-time sync with friends.",
};

export default function HomePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[800px] h-[500px] rounded-full
                        bg-amber-500/6 blur-[120px]"
        />
        <div
          className="absolute bottom-1/4 right-1/4
                        w-[400px] h-[300px] rounded-full
                        bg-jade/4 blur-[100px]"
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>
      <div className="relative z-10 text-center mb-10 max-w-xl">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                        bg-amber-500 shadow-2xl shadow-amber-500/20 mb-6
                        ring-1 ring-amber-400/50"
        >
          <FilmIcon className="w-8 h-8 text-void" />
        </div>

        <h1 className="font-display text-4xl sm:text-5xl font-bold text-bright tracking-tight leading-tight mb-4">
          Watch Together,
          <br />
          <span className="text-amber-400">perfectly in sync</span>
        </h1>

        <p className="text-dim text-base leading-relaxed max-w-sm mx-auto">
          Create a private room, share the link, and watch any video with
          friends — all in real time.
        </p>
      </div>
      <div className="relative z-10 w-full max-w-md mb-10">
        <CreateRoomForm />
      </div>
      <div className="relative z-10 w-full max-w-md grid grid-cols-2 gap-3">
        <FeatureCell
          icon="⚡"
          title="Real-time sync"
          desc="Frame-perfect playback across all viewers"
        />
        <FeatureCell
          icon="💬"
          title="Live chat"
          desc="React and chat as you watch"
        />
        <FeatureCell
          icon="🎬"
          title="Host controls"
          desc="Play, pause, and seek for the whole room"
        />
        <FeatureCell
          icon="🔗"
          title="Instant sharing"
          desc="One link — no account needed"
        />
      </div>
      <p className="relative z-10 mt-8 text-xs text-muted/60 font-mono text-center">
        Supports MP4 · WebM · HLS · YouTube · Vimeo
      </p>
    </main>
  );
}

function FeatureCell({ icon, title, desc }) {
  return (
    <div className="glass-card p-4 flex flex-col gap-2">
      <span className="text-xl leading-none">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-white/80 leading-snug">
          {title}
        </p>
        <p className="text-xs text-muted/70 leading-snug mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function FilmIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="2" y="2" width="20" height="20" rx="2.5" />
      <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5" />
    </svg>
  );
}

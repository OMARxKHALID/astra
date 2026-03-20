import CreateRoomForm from "@/components/client/CreateRoomForm";

export const metadata = {
  title: "WatchTogether — Watch videos in sync",
  description:
    "Create a private room, share the link, watch any video in perfect real-time sync with friends.",
};

export default function HomePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 relative overflow-y-auto overflow-x-hidden">
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
      <div className="relative z-10 text-center mb-6 max-w-xl">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-[2rem]
                        bg-amber-500 shadow-2xl shadow-amber-500/20 mb-6
                        ring-1 ring-amber-400/50"
        >
          <FilmIcon className="w-8 h-8 text-void" />
        </div>

        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-bright tracking-tight leading-tight mb-3">
          Watch Together,
          <br />
          <span className="text-amber-400">perfectly in sync</span>
        </h1>

        <p className="text-dim text-base leading-relaxed max-w-sm mx-auto">
          Create a private room, share the link, and watch any video with
          friends — all in real time.
        </p>
      </div>
      <div className="relative z-10 w-full max-w-md mb-6">
        <CreateRoomForm />
      </div>
      <div className="relative z-10 w-full max-w-md grid grid-cols-2 gap-3 pb-8">
        <FeatureCell
          icon={<ZapIcon className="w-5 h-5 text-amber-500" />}
          title="Real-time sync"
          desc="Frame-perfect playback"
        />
        <FeatureCell
          icon={<ChatIcon className="w-5 h-5 text-blue-400" />}
          title="Live chat"
          desc="React and talk as you watch"
        />
        <FeatureCell
          icon={<ControlsIcon className="w-5 h-5 text-purple-400" />}
          title="Host controls"
          desc="Play, pause, and seek for all"
        />
        <FeatureCell
          icon={<LinkIcon className="w-5 h-5 text-green-400" />}
          title="Instant sharing"
          desc="One link — no account"
        />
      </div>
    </main>
  );
}

function FeatureCell({ icon, title, desc }) {
  return (
    <div className="glass-card p-4 flex gap-3 shadow-lg hover:border-white/10 transition-colors">
      <div className="shrink-0 rounded-[2rem] bg-white/5 border border-white/5 w-8 h-8 flex items-center justify-center opacity-80">
        {icon}
      </div>
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

function ZapIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function ChatIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ControlsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" />
    </svg>
  );
}

function LinkIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

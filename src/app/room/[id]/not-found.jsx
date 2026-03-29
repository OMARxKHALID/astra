import Link from "next/link";

export default function RoomNotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="w-20 h-20 rounded-3xl bg-amber/10 border border-amber/20 flex items-center justify-center">
        <span className="text-3xl">🎬</span>
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold text-bright mb-2">Room not found</h1>
        <p className="text-dim text-sm max-w-xs mx-auto">
          This room doesn&apos;t exist or has expired. Ask the host to share a new link.
        </p>
      </div>
      <Link
        href="/"
        className="btn-primary px-8 py-3 text-sm"
      >
        Create a new room
      </Link>
    </main>
  );
}

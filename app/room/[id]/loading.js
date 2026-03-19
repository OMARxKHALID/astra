export default function RoomLoading() {
  return (
    <div className="h-dvh bg-void flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
        <p className="text-sm text-muted font-mono uppercase tracking-widest">Loading room…</p>
      </div>
    </div>
  );
}

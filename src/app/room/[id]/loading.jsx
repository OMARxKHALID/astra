export default function RoomLoading() {
  return (
    <div className="h-dvh w-full bg-void flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-amber/20 border-t-amber animate-spin" />
        <p className="text-white/30 text-xs font-mono uppercase tracking-widest">
          Joining room…
        </p>
      </div>
    </div>
  );
}

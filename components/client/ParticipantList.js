"use client";

function Avatar({ name, isMe, isHost }) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div
      title={isMe ? "You" : name}
      className={`relative w-9 h-9 rounded-xl flex items-center justify-center
                  text-[11px] font-bold font-mono shrink-0 select-none
                  ${
                    isMe
                      ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                      : "bg-white/5 border border-white/10 text-white/50"
                  }`}
    >
      {initials}
      {isHost && (
        <span
          aria-label="Host"
          className="absolute -top-1 -right-1 text-[9px] leading-none"
        >
          👑
        </span>
      )}
    </div>
  );
}

export default function ParticipantList({
  participants = [],
  myUserId,
  hostId,
  isHost,
  displayNames = {},
  onKick,
}) {
  const getName = (uid) => displayNames[uid] || `Guest-${uid.slice(0, 4)}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-jade/10 flex items-center justify-center border border-jade/20 shrink-0">
          <UsersIcon className="w-4 h-4 text-jade/70" />
        </div>
        <div>
          <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">
            Watching
          </p>
          <p className="text-xs font-medium text-text/70">
            {participants.length}{" "}
            {participants.length === 1 ? "person" : "people"}
          </p>
        </div>
      </div>

      {/* List */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
        style={{ scrollbarWidth: "none" }}
      >
        {participants.length === 0 && (
          <div className="flex items-center justify-center h-full opacity-30">
            <p className="text-[10px] font-mono text-muted uppercase tracking-wider text-center">
              No one here yet
            </p>
          </div>
        )}

        {participants.map((uid) => {
          const isMe = uid === myUserId;
          const isThisHost = uid === hostId;
          const name = getName(uid);
          const canKick = isHost && !isMe && !isThisHost;

          return (
            <div
              key={uid}
              className="group flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-white/[0.04] transition-colors"
            >
              <Avatar name={name} isMe={isMe} isHost={isThisHost} />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium text-white/75 truncate leading-tight">
                  {name}
                  {isMe && (
                    <span className="ml-1.5 text-[10px] text-amber-400/50 font-mono">
                      (you)
                    </span>
                  )}
                </span>
                {isThisHost && (
                  <span className="text-[9px] font-mono text-jade/50 uppercase tracking-wider">
                    host
                  </span>
                )}
              </div>

              {/* Kick button — host only, non-self, non-host */}
              {canKick && (
                <button
                  onClick={() => onKick?.(uid)}
                  title={`Kick ${name}`}
                  className="opacity-0 group-hover:opacity-100 transition-opacity
                             w-7 h-7 flex items-center justify-center rounded-lg
                             bg-danger/10 hover:bg-danger/20 border border-danger/20
                             text-danger/60 hover:text-danger text-xs shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UsersIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

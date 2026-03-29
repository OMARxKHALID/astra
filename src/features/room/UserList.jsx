"use client";

import { useState } from "react";
import { Crown, Users } from "lucide-react";
import Image from "next/image";

// [Note] sync quality dot: green/yellow/red based on leader drift
function QualityDot({ deviation }) {
  const base = "w-2 h-2 rounded-full shrink-0 flex-none";
  if (deviation === null)
    return <span className={`${base} bg-white/15`} title="No data" />;
  if (deviation < 0.5)
    return (
      <span
        className={`${base} bg-jade shadow-[0_0_6px_rgba(16,185,129,0.5)]`}
        title="In sync"
      />
    );
  if (deviation < 2)
    return (
      <span
        className={`${base} bg-amber-400`}
        title={`${deviation.toFixed(1)}s drift`}
      />
    );
  return (
    <span
      className={`${base} bg-danger`}
      title={`${deviation.toFixed(1)}s drift`}
    />
  );
}

function Avatar({ name, isHost }) {
  const seed = encodeURIComponent(name);
  return (
    <div className="relative w-7 h-7 flex items-center justify-center shrink-0 select-none">
      <Image
        src={`https://api.dicebear.com/9.x/bottts/svg?seed=${seed}`}
        alt={name}
        fill
        sizes="40px"
        className="w-full h-full object-contain"
        unoptimized
      />
      {isHost && (
        <div
          className="absolute -top-1 -right-0.5 w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center border shadow-[0_0_6px_rgba(245,158,11,0.5)]"
          style={{ borderColor: "var(--color-void)", zIndex: 10 }}
        >
          <Crown className="w-2 h-2 text-void" strokeWidth={3} />
        </div>
      )}
    </div>
  );
}

export default function UserList({
  participants = [],
  myUserId,
  hostId,
  isHost,
  displayNames = {},
  onKick,
  onTransferHost,
  tsMap = {},
  leaderTime = 0,
}) {
  const [confirmTransfer, setConfirmTransfer] = useState(null);
  const getName = (uid) =>
    displayNames[uid] || `Guest-${uid.slice(0, 4).toUpperCase()}`;

  function handleTransfer(uid) {
    if (confirmTransfer === uid) {
      onTransferHost?.(uid);
      setConfirmTransfer(null);
    } else {
      setConfirmTransfer(uid);
      // [Note] Auto-clear confirm state after 4s
      setTimeout(() => setConfirmTransfer((p) => (p === uid ? null : p)), 4000);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 space-y-1">
        {participants.length === 0 && (
          <div className="flex items-center justify-center h-full opacity-30">
            <p
              className="text-[10px] font-mono uppercase tracking-wider text-center"
              style={{ color: "var(--color-muted)" }}
            >
              No one here yet
            </p>
          </div>
        )}

        {participants.map((uid) => {
          const isMe = uid === myUserId;
          const isThisHost = uid === hostId;
          const name = getName(uid);
          const deviation =
            leaderTime > 0 && typeof tsMap[uid] === "number"
              ? Math.abs(tsMap[uid] - leaderTime)
              : null;
          const canKick = isHost && !isMe && !isThisHost;
          const canTransfer =
            isHost && !isMe && !isThisHost && !!onTransferHost;
          const confirming = confirmTransfer === uid;

          return (
            <div
              key={uid}
              className="group flex items-center gap-2 py-1.5 px-2 rounded-[var(--radius-pill)] transition-colors hover:bg-white/[0.04]"
            >
              <Avatar name={name} isHost={isThisHost} />

              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-bold text-white/80 transition-colors truncate">
                    {name}
                  </span>
                  {isMe && (
                    <span className="text-[9px] text-white/20 font-mono">
                      (you)
                    </span>
                  )}
                </div>
                {isThisHost && (
                  <span className="text-[8px] font-mono text-amber-500/70 uppercase tracking-[0.15em] leading-none">
                    host
                  </span>
                )}
              </div>

              {/* [Note] fixed-width action column prevents layout shift */}
              <div className="flex items-center gap-1 shrink-0 w-20 justify-end">
                {canTransfer && (
                  <button
                    onClick={() => handleTransfer(uid)}
                    title={confirming ? "Confirm: make host?" : "Transfer host"}
                    className={`opacity-0 group-hover:opacity-100 transition-all w-6 h-6 shrink-0 flex items-center justify-center rounded-[var(--radius-pill)] text-xs
                      ${
                        confirming
                          ? "bg-amber-500/20 border border-amber-500/40 text-amber-500 !opacity-100 animate-pulse"
                          : "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-500/60 hover:text-amber-500"
                      }`}
                  >
                    <Crown className="w-2.5 h-2.5" strokeWidth={2} />
                  </button>
                )}
                {canKick && (
                  <button
                    onClick={() => onKick?.(uid)}
                    title={`Kick ${name}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-[var(--radius-pill)] bg-danger/10 hover:bg-danger/20 border border-danger/20 text-danger/60 hover:text-danger text-[10px]"
                  >
                    ✕
                  </button>
                )}
                <QualityDot deviation={deviation} />
              </div>
            </div>
          );
        })}
      </div>

      {confirmTransfer && (
        <div className="px-4 pb-3 shrink-0">
          <p className="text-[10px] font-mono text-center text-amber-500/60">
            Tap crown again to confirm
          </p>
        </div>
      )}
    </div>
  );
}

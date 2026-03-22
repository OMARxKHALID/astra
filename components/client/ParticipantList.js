"use client";

import { useState } from "react";
import { Crown as CrownIcon, Users as UsersIcon, X as XIcon } from "lucide-react";

function QualityDot({ deviation }) {
  const base = "w-2 h-2 rounded-full shrink-0 flex-none";
  if (deviation === null)
    return (
      <span
        className={`${base} bg-white/15`}
        title="No data"
        style={{ backgroundColor: "var(--color-border)" }}
      />
    );
  if (deviation < 0.5)
    return (
      <span
        className={`${base} bg-jade shadow-[0_0_6px_rgba(16,185,129,0.5)]`}
        title="Excellent sync"
      />
    );
  if (deviation < 2)
    return <span className={`${base} bg-amber-400`} title="Minor drift" />;
  return <span className={`${base} bg-danger`} title="Large drift" />;
}

function Avatar({ name, isMe, isHost }) {
  return (
    <div
      title={isMe ? "You" : name}
      className="relative w-9 h-9 rounded-2xl flex items-center justify-center text-[11px] font-bold font-mono shrink-0 select-none"
      style={{
        backgroundColor: isMe
          ? "rgba(245,158,11,0.15)"
          : "var(--color-surface)",
        border: isMe
          ? "1px solid rgba(245,158,11,0.35)"
          : "1px solid var(--color-border)",
        color: isMe ? "#f59e0b" : "var(--color-muted)",
      }}
    >
      {name.slice(0, 2).toUpperCase()}
      {isHost && (
        <div
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500
                        flex items-center justify-center
                        shadow-[0_0_6px_rgba(245,158,11,0.5)]"
          style={{ border: "2px solid var(--color-void)" }}
        >
          <CrownIcon className="w-2 h-2 text-white" strokeWidth={2.5} />
        </div>
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
  onTransferHost,
  tsMap = {},
  leaderTime = 0,
}) {
  const [confirmTransfer, setConfirmTransfer] = useState(null);
  const getName = (uid) => displayNames[uid] || `Guest-${uid.slice(0, 4)}`;

  function handleTransfer(uid) {
    if (confirmTransfer === uid) {
      onTransferHost?.(uid);
      setConfirmTransfer(null);
    } else {
      setConfirmTransfer(uid);
      setTimeout(() => setConfirmTransfer((p) => (p === uid ? null : p)), 4000);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div
          className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
          style={{
            backgroundColor: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.2)",
          }}
        >
          <UsersIcon className="w-4 h-4 text-jade" strokeWidth={1.5} />
        </div>
        <div>
          <p
            className="text-[9px] font-black uppercase tracking-[0.3em]"
            style={{ color: "var(--color-muted)" }}
          >
            Watching
          </p>
          <p
            className="text-xs font-medium"
            style={{ color: "var(--color-text)" }}
          >
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
          const userTime = tsMap[uid];
          const deviation =
            leaderTime > 0 && typeof userTime === "number"
              ? Math.abs(userTime - leaderTime)
              : null;
          const canKick = isHost && !isMe && !isThisHost;
          const canTransfer =
            isHost && !isMe && !isThisHost && !!onTransferHost;
          const confirming = confirmTransfer === uid;

          return (
            <div
              key={uid}
              className="group flex items-center gap-2.5 py-2 px-2 rounded-2xl transition-colors"
              style={{ ["--hover-bg"]: "var(--color-surface)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--color-surface)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
            >
              <Avatar name={name} isMe={isMe} isHost={isThisHost} />

              <div className="flex flex-col min-w-0 flex-1">
                <span
                  className="text-sm font-medium truncate leading-tight"
                  style={{ color: "var(--color-text)" }}
                >
                  {name}
                  {isMe && (
                    <span className="ml-1.5 text-[10px] text-amber-500/50 font-mono">
                      (you)
                    </span>
                  )}
                </span>
                {isThisHost && (
                  <span className="text-[9px] font-mono text-jade/60 uppercase tracking-wider">
                    host
                  </span>
                )}
              </div>

              {/* Fixed-width action area — dot never shifts */}
              <div className="flex items-center gap-1 shrink-0 w-14 justify-end">
                {canTransfer && (
                  <button
                    onClick={() => handleTransfer(uid)}
                    title={confirming ? "Confirm: make host?" : "Transfer host"}
                    className={`opacity-0 group-hover:opacity-100 transition-all w-7 h-7 flex items-center justify-center rounded-xl text-xs
                      ${
                        confirming
                          ? "bg-amber-500/20 border border-amber-500/40 text-amber-500 !opacity-100 animate-pulse"
                          : "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-500/60 hover:text-amber-500"
                      }`}
                  >
                    <CrownIcon className="w-3 h-3" strokeWidth={2} />
                  </button>
                )}
                {canKick && (
                  <button
                    onClick={() => onKick?.(uid)}
                    title={`Kick ${name}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-xl bg-danger/10 hover:bg-danger/20 border border-danger/20 text-danger/60 hover:text-danger text-xs"
                  >
                    <XIcon className="w-3 h-3" strokeWidth={2.5} />
                  </button>
                )}
              </div>

              <QualityDot deviation={deviation} />
            </div>
          );
        })}
      </div>

      {confirmTransfer && (
        <div className="px-4 pb-3">
          <p className="text-[10px] font-mono text-center text-amber-500/60">
            Tap crown again to confirm
          </p>
        </div>
      )}
    </div>
  );
}

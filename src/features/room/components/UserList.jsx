"use client";

import { useState } from "react";
import { Crown, Mic, MicOff, X as XIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { EXTERNAL_SERVICES } from "@/constants/config";

function QualityDot({ deviation }) {
  const base = "w-2 h-2 rounded-full shrink-0 flex-none";
  if (deviation === null)
    return <span className={`${base} bg-white/10`} title="No data" />;
  if (deviation < 0.5)
    return (
      <span
        className={`${base} bg-jade shadow-[0_0_6px_rgba(var(--color-jade-rgb), 0.5)]`}
        title="In sync"
      />
    );
  if (deviation < 2)
    return (
      <span
        className={`${base} bg-amber`}
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

function SyncStatus({ deviation }) {
  if (deviation === null) {
    return (
      <span className="text-[9px] text-white/20 font-mono">No sync data</span>
    );
  }
  if (deviation < 0.5) {
    return (
      <span className="text-[9px] text-jade/70 font-mono flex items-center gap-1">
        <span className="w-1 h-1 rounded-full bg-jade animate-pulse" />
        In sync
      </span>
    );
  }
  if (deviation < 2) {
    return (
      <span className="text-[9px] text-amber/70 font-mono">
        {deviation.toFixed(1)}s behind
      </span>
    );
  }
  return (
    <span className="text-[9px] text-danger/70 font-mono">
      {deviation.toFixed(1)}s behind
    </span>
  );
}

function Avatar({ name, isHost, inCall, micActive, camActive }) {
  const seed = encodeURIComponent(name);
  return (
    <div className="relative w-8 h-8 flex items-center justify-center shrink-0 select-none">
      <Image
        src={`${EXTERNAL_SERVICES.avatarService}${seed}`}
        alt={name}
        fill
        sizes="48px"
        className="w-full h-full object-contain"
        unoptimized
      />
      {isHost && (
        <div className="absolute -top-1 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber flex items-center justify-center border shadow-[0_0_6px_rgba(var(--color-amber-rgb), 0.5)]">
          <Crown className="w-2 h-2 text-void" strokeWidth={3} />
        </div>
      )}
      {inCall && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-jade border-2 border-void flex items-center justify-center">
          {micActive !== false ? (
            <Mic className="w-1.5 h-1.5 text-void" strokeWidth={3} />
          ) : (
            <MicOff className="w-1.5 h-1.5 text-void" strokeWidth={3} />
          )}
        </div>
      )}
    </div>
  );
}

export function UserList({
  participants = [],
  myUserId,
  hostId,
  isHost,
  displayNames = {},
  onKick,
  onTransferHost,
  tsMap = {},
  leaderTime = 0,
  inCallUsers = [],
  remoteStatus = {},
  typingUsers = {},
}) {
  const [confirmTransfer, setConfirmTransfer] = useState(null);
  const [confirmKick, setConfirmKick] = useState(null);
  const getName = (uid) =>
    displayNames[uid] || `Guest-${uid.slice(0, 4).toUpperCase()}`;
  
  const now = Date.now();
  const isTyping = (uid) => {
    const typing = typingUsers[uid];
    return typing && now - typing.ts < 3000;
  };

  function handleTransfer(uid) {
    if (confirmTransfer === uid) {
      onTransferHost?.(uid);
      setConfirmTransfer(null);
    } else {
      setConfirmTransfer(uid);
      setTimeout(() => setConfirmTransfer((p) => (p === uid ? null : p)), 4000);
    }
  }

  function handleKick(uid) {
    if (confirmKick === uid) {
      onKick?.(uid);
      setConfirmKick(null);
    } else {
      setConfirmKick(uid);
      setTimeout(() => setConfirmKick((p) => (p === uid ? null : p)), 4000);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-2 space-y-1">
        {participants.map((uid) => {
          const isMe = uid === myUserId;
          const isThisHost = uid === hostId;
          const name = getName(uid);
          const deviation = leaderTime > 0 && typeof tsMap[uid] === "number" ? Math.abs(tsMap[uid] - leaderTime) : null;
          const canKick = isHost && !isMe && !isThisHost;
          const canTransfer = isHost && !isMe && !isThisHost && !!onTransferHost;
          const confirmingT = confirmTransfer === uid;
          const confirmingK = confirmKick === uid;
          const inCall = inCallUsers.includes(uid);
          const userStatus = remoteStatus?.[uid];
          const micActive = userStatus?.micActive !== false;
          const camActive = userStatus?.camActive !== false;

          return (
            <div
              key={uid}
              className="group flex items-center gap-2 py-2 px-2 rounded-[var(--radius-pill)] transition-colors hover:bg-white/[0.04] active:bg-white/[0.06]"
            >
              <Avatar name={name} isHost={isThisHost} inCall={inCall} micActive={micActive} camActive={camActive} />

              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-bold text-white/80 truncate">
                    {name}
                  </span>
                  {isMe && (
                    <span className="text-[9px] text-white/40 font-mono shrink-0">
                      (you)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isThisHost && (
                    <span className="text-[9px] font-mono font-bold text-amber/80 uppercase tracking-[0.15em] leading-none">
                      host
                    </span>
                  )}
                  {isTyping(uid) ? (
                    <span className="text-[9px] text-amber/70 font-mono flex items-center gap-1">
                      <span className="flex gap-0.5">
                        <span className="w-1 h-1 bg-amber/70 rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: "0ms" }} />
                        <span className="w-1 h-1 bg-amber/70 rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: "150ms" }} />
                        <span className="w-1 h-1 bg-amber/70 rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: "300ms" }} />
                      </span>
                      typing
                    </span>
                  ) : (
                    <SyncStatus deviation={deviation} />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {canTransfer && (
                  <Button
                    variant="custom"
                    size="sm"
                    onClick={() => handleTransfer(uid)}
                    title={confirmingT ? "Confirm: make host?" : "Transfer host"}
                    aria-label={confirmingT ? "Confirm: make host?" : "Transfer host"}
                    className={`shrink-0 !w-8 !p-0 !min-w-0 ${
                      confirmingT 
                        ? "bg-amber/20 border-amber/40 text-amber animate-pulse" 
                        : "bg-amber/10 hover:bg-amber/20 border-amber/20 text-amber/70 hover:text-amber"
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5" strokeWidth={2} />
                  </Button>
                )}
                {canKick && (
                  <Button
                    variant="custom"
                    size="sm"
                    onClick={() => handleKick(uid)}
                    title={confirmingK ? `Confirm: kick ${name}?` : `Kick ${name}`}
                    aria-label={confirmingK ? `Confirm kick ${name}` : `Kick ${name}`}
                    className={`shrink-0 !w-8 !p-0 !min-w-0 ${
                      confirmingK 
                        ? "bg-danger/20 border-danger/40 text-danger animate-pulse" 
                        : "bg-danger/10 hover:bg-danger/20 border-danger/20 text-danger/70 hover:text-danger"
                    }`}
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </Button>
                )}
                {!canKick && !canTransfer && (
                  <QualityDot deviation={deviation} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(confirmTransfer || confirmKick) && (
        <div className="px-4 pb-3 shrink-0">
          <p className="text-[10px] font-mono text-center text-amber/60 animate-in fade-in zoom-in-95">
            Tap {confirmTransfer ? "crown" : "✕"} again to confirm
          </p>
        </div>
      )}
    </div>
  );
}

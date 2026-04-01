import { memo } from "react";
import { SYSTEM_ICONS } from "../roomMaps";
import { VoiceNote } from "./VoiceNote";

function ChatMessageInner({
  msg,
  isOwn,
  displayNames = {},
  onReaction,
  currentUserId,
}) {
  const REACTION_EMOJIS = ["❤️", "😂", "🔥", "👍", "😮"];

  const renderTextWithMentions = (text) => {
    if (!text) return null;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={i}
            className="text-amber font-bold drop-shadow-sm brightness-110 px-0.5"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const time = msg.ts
    ? new Date(msg.ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";
  const name =
    msg.senderName ||
    displayNames[msg.senderId] ||
    (msg.senderId ? msg.senderId.slice(0, 6) : "Guest");

  if (msg.senderId === "system") {
    let icon = null,
      text = msg.text || "";
    for (const [tag, { Icon, color }] of Object.entries(SYSTEM_ICONS)) {
      if (text.includes(tag)) {
        icon = (
          <Icon className={`w-3 h-3 ${color} shrink-0`} strokeWidth={2.5} />
        );
        text = text.replace(tag, "").trim();
        break;
      }
    }
    return (
      <div className="flex justify-center">
        <div
          className="px-3.5 py-1 rounded-xl border text-[11px] font-mono uppercase tracking-wide flex items-center gap-1.5"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
            color: "text-white/60",
          }}
        >
          {icon}
          {text}
        </div>
      </div>
    );
  }

  const isAudio = msg.dataUrl?.startsWith("data:audio/");

  return (
    <div
      className={`flex ${isOwn ? "flex-row-reverse" : "flex-row"} gap-2 group relative hover:z-50`}
    >
      {/* [Note] Reaction Picker: Tactical bar with chiselled radii for high-density space */}
      <div
        className={`absolute -top-7 ${isOwn ? "right-0" : "left-0"} opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 flex items-center gap-1 p-1 glass-card rounded-xl shadow-2xl pointer-events-none group-hover:pointer-events-auto scale-90 group-hover:scale-100 origin-bottom border-white/10`}
      >
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onReaction?.(emoji)}
            className="w-5 h-5 flex items-center justify-center text-xs hover:scale-125 transition-transform active:scale-90 opacity-70 hover:opacity-100"
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className={`shrink-0 mt-0.5 ${isOwn ? "order-2" : "order-1"}`}>
        <img
          src={`https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(name)}`}
          alt={name}
          className="w-6 h-6 object-contain rounded-xl bg-white/10 p-1 border border-white/10"
          loading="lazy"
        />
      </div>
      <div
        className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] ${isOwn ? "items-end order-1" : "items-start order-2"}`}
      >
        {!isOwn && (
          <div className="flex items-center gap-1.5 px-0.5 mb-px opacity-60">
            <span className="text-[11px] font-bold text-white/50">{name}</span>
            <span className="text-[10px] font-mono text-white/50">{time}</span>
          </div>
        )}

        {msg.dataUrl && (
          <div className={msg.text ? "mb-1" : ""}>
            {isAudio ? (
              <VoiceNote src={msg.dataUrl} isOwn={isOwn} />
            ) : (
              <img
                src={msg.dataUrl}
                alt="Screenshot"
                className="max-w-[220px] rounded-2xl border shadow-lg"
                style={{ borderColor: "var(--color-border)" }}
              />
            )}
          </div>
        )}
        {msg.text && (
          <div
            className={`px-3 py-1.5 rounded-2xl text-[13.5px] font-mono leading-snug break-words shadow-sm relative border
              ${
                isOwn
                  ? "bg-amber text-void font-bold border-amber/40"
                  : "bg-white/5 text-white/90 shadow-sm border-white/10 backdrop-blur-md"
              }`}
          >
            {isOwn ? msg.text : renderTextWithMentions(msg.text)}
          </div>
        )}

        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div
            className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}
          >
            {Object.entries(msg.reactions).map(([emoji, users]) => {
              const hasReacted = users.includes(currentUserId);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReaction?.(emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all duration-300
                    ${
                      hasReacted
                        ? "bg-amber/15 border-amber/40 text-amber shadow-sm scale-105 font-bold"
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    }`}
                >
                  <span className="text-[10px] leading-none">{emoji}</span>
                  {users.length > 0 && (
                    <span className="text-[10px] font-mono opacity-80 leading-none">{users.length}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {(isOwn || (!msg.text && msg.dataUrl)) && (
          <span className="text-[10px] font-mono text-white/50 px-1 mt-0.5">
            {time}
          </span>
        )}
      </div>
    </div>
  );
}

export const ChatMessage = memo(ChatMessageInner);

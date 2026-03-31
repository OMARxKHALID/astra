import { SYSTEM_ICONS } from "../roomMaps";
import { VoiceNote } from "./VoiceNote";

export function ChatMessage({ msg, isOwn, displayNames = {} }) {
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
    let icon = null, text = msg.text || "";
    for (const [tag, { Icon, color }] of Object.entries(SYSTEM_ICONS)) {
      if (text.includes(tag)) {
        icon = <Icon className={`w-3 h-3 ${color} shrink-0`} strokeWidth={2.5} />;
        text = text.replace(tag, "").trim();
        break;
      }
    }
    return (
      <div className="flex justify-center">
        <div
          className="px-3.5 py-1 rounded-[var(--radius-pill)] border text-[10px] font-mono uppercase tracking-wide flex items-center gap-1.5"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
            color: "var(--color-muted)",
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
      className={`flex ${isOwn ? "flex-row-reverse" : "flex-row"} gap-2 group`}
    >
      <div className={`shrink-0 mt-0.5 ${isOwn ? "order-2" : "order-1"}`}>
        <img
          src={`https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(name)}`}
          alt={name}
          className="w-6 h-6 object-contain rounded-full bg-white/10 p-1 border border-white/10"
          loading="lazy"
        />
      </div>
      <div
        className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] ${isOwn ? "items-end order-1" : "items-start order-2"}`}
      >
        {!isOwn && (
          <div className="flex items-center gap-1.5 px-0.5 mb-px opacity-60">
            <span className="text-[10px] font-bold text-white/40">{name}</span>
            <span className="text-[9px] font-mono text-white/40">{time}</span>
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
                className="max-w-[220px] rounded-xl border shadow-lg"
                style={{ borderColor: "var(--color-border)" }}
              />
            )}
          </div>
        )}

        {msg.text && (
          <div
            className={`px-3 py-1.5 rounded-[20px] text-[13px] leading-snug break-words shadow-sm
              ${
                isOwn
                  ? "bg-amber text-void rounded-tr-[4px] font-medium"
                  : "bg-white/10 text-white/40 border border-white/10 rounded-tl-[4px]"
              }`}
          >
            {msg.text}
          </div>
        )}

        {(isOwn || (!msg.text && msg.dataUrl)) && (
          <span className="text-[9px] font-mono text-white/40 px-1 mt-0.5">
            {time}
          </span>
        )}
      </div>
    </div>
  );
}

import { memo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const msgRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [rect, setRect] = useState(null);
  // [Note] longPressTimer: mobile long-press (500ms) to show the reaction picker,
  // since onMouseEnter never fires on touch-only devices.
  const longPressTimerRef = useRef(null);

  // [Note] Coordinate Sync: Ensure the portal-based picker hides or repositions
  // during scroll to maintain the 'stuck-to-bubble' illusion.
  useEffect(() => {
    if (!isHovered) return;
    const hideOnScroll = () => setIsHovered(false);
    window.addEventListener("scroll", hideOnScroll, true);
    return () => window.removeEventListener("scroll", hideOnScroll, true);
  }, [isHovered]);

  const showPicker = () => {
    if (!msgRef.current) return;
    setRect(msgRef.current.getBoundingClientRect());
    setIsHovered(true);
  };

  const handleMouseEnter = () => showPicker();
  const handleMouseLeave = () => setIsHovered(false);

  const handleTouchStart = () => {
    longPressTimerRef.current = setTimeout(showPicker, 500);
  };
  const handleTouchEnd = () => {
    clearTimeout(longPressTimerRef.current);
  };

  const renderTextWithMentions = (text) => {
    if (!text) return null;
    const parts = text.split(/(@[\w-]+)/g);
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
        <div className="px-3.5 py-1 rounded-xl border border-white/10 text-[11px] font-mono uppercase tracking-wide flex items-center gap-1.5 bg-surface text-white/60">
          {icon}
          {text}
        </div>
      </div>
    );
  }

  const isAudio = msg.dataUrl?.startsWith("data:audio/");

  return (
    <div
      ref={msgRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`flex ${isOwn ? "flex-row-reverse" : "flex-row"} gap-2 group relative animate-[messageIn_0.35s_cubic-bezier(0.23,1,0.32,1)]`}
    >
      {/* [Note] Border-Proof Portal: Bypasses header/overflow boundaries. Uses fixed
          positioning synced to the bubble's viewport coordinates. */}
      {isHovered &&
        rect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="fixed flex items-center gap-1 p-1 bg-void/60 backdrop-blur-xl rounded-xl shadow-[0_30px_90px_rgba(0,0,0,0.6)] z-[999] animate-in fade-in zoom-in-95 duration-200 border border-white/5"
            style={{
              top: `${rect.top - 28}px`,
              left: isOwn ? `${rect.right - 100}px` : `${rect.left + 30}px`,
            }}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReaction?.(emoji);
                  setIsHovered(false);
                }}
                className="w-5 h-5 flex items-center justify-center text-[13px] hover:scale-125 transition-transform active:scale-90 touch-manipulation"
              >
                {emoji}
              </button>
            ))}
          </div>,
          document.body,
        )}
      <div
        className={`shrink-0 mt-0.5 transition-transform duration-300 group-hover:scale-110 ${isOwn ? "order-2" : "order-1"}`}
      >
        <img
          src={`https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(name)}`}
          alt={name}
          className="w-5 h-5 object-contain rounded-[var(--radius-pill)] bg-white/10 p-1 border border-white/10 shadow-sm"
          loading="lazy"
        />
      </div>
      <div
        className={`flex flex-col gap-0.5 max-w-[90%] sm:max-w-[82%] transition-all duration-300 ${isOwn ? "items-end order-1" : "items-start order-2"}`}
      >
        {!isOwn && (
          <div className="flex items-center gap-1.5 px-0.5 mb-px opacity-50 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">
              {name}
            </span>
            <span className="text-[9px] font-mono text-white/40">{time}</span>
          </div>
        )}

        {msg.dataUrl && (
          <div
            className={`${msg.text ? "mb-1" : ""} transition-transform duration-300 group-hover:scale-[1.01]`}
          >
            {isAudio ? (
              <VoiceNote src={msg.dataUrl} isOwn={isOwn} />
            ) : (
              <img
                src={msg.dataUrl}
                alt="Screenshot"
                className="max-w-full rounded-[var(--radius-panel)] border shadow-lg"
                style={{ borderColor: "var(--color-border)" }}
              />
            )}
          </div>
        )}
        {msg.text && (
          <div
            className={`px-3 py-1.5 rounded-[var(--radius-pill)] text-[13px] font-mono leading-tight break-words shadow-sm relative border transition-all duration-300 group-hover:shadow-lg
              ${
                isOwn
                  ? "bg-amber text-void font-bold border-amber/40 group-hover:border-amber/60 group-hover:brightness-105"
                  : "bg-white/5 text-white/90 shadow-sm border-white/10 backdrop-blur-md group-hover:bg-white/10 group-hover:border-white/20"
              }`}
          >
            {isOwn ? msg.text : renderTextWithMentions(msg.text)}
          </div>
        )}

        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div
            className={`flex flex-wrap gap-1 mt-0.5 animate-[fadeIn_0.5s_ease-out] ${isOwn ? "justify-end" : "justify-start"}`}
          >
            {Object.entries(msg.reactions).map(([emoji, users]) => {
              const hasReacted = users.includes(currentUserId);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReaction?.(emoji)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[var(--radius-pill)] border transition-all duration-300 hover:scale-105 active:scale-95 touch-manipulation
                    ${
                      hasReacted
                        ? "bg-amber/15 border-amber/40 text-amber shadow-[0_0_12px_rgba(var(--color-amber-rgb),0.1)] font-bold"
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    }`}
                >
                  <span className="text-[10px] leading-none">{emoji}</span>
                  {users.length > 0 && (
                    <span className="text-[9px] font-mono opacity-80 leading-none">
                      {users.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {(isOwn || (!msg.text && msg.dataUrl)) && (
          <span className="text-[9px] font-mono text-white/40 px-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {time}
          </span>
        )}
      </div>
    </div>
  );
}

export const ChatMessage = memo(ChatMessageInner);

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle as ChatBubbleIcon,
  Send as SendIcon,
  Crown as CrownIcon,
  Film as FilmIcon,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  Captions as CcIcon,
} from "lucide-react";
import { SYSTEM_ICONS } from "./roomMaps";

export default function ChatSidebar({
  messages = [],
  userId,
  displayNames = {},
  onSend,
  typingUsers = {},
  onTyping,
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const atBottomRef = useRef(true);
  const scrollRef = useRef(null);
  const typingTimerRef = useRef(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Track whether the user has scrolled up so we don't auto-scroll over their reading
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  }, []);

  useEffect(() => {
    if (atBottomRef.current)
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  function handleSubmit() {
    const t = input.trim();
    if (!t) return;
    onSend(t);
    setInput("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInputChange(e) {
    setInput(e.target.value);
    if (onTyping) {
      onTyping();
      clearTimeout(typingTimerRef.current);
    }
  }

  const now = Date.now();
  const activeTypers = Object.entries(typingUsers)
    .filter(([uid, d]) => uid !== userId && now - d.ts < 3000)
    .map(([, d]) => d.username);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 space-y-4"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
            <ChatBubbleIcon
              className="w-10 h-10"
              style={{ color: "var(--color-muted)" }}
              strokeWidth={1}
            />
            <p
              className="text-[11px] font-mono text-center max-w-[160px] leading-relaxed uppercase tracking-wider"
              style={{ color: "var(--color-muted)" }}
            >
              The thread is quiet.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage
            key={`${msg.ts ?? i}-${i}`}
            msg={msg}
            isOwn={msg.senderId === userId}
            displayNames={displayNames}
          />
        ))}

        {activeTypers.length > 0 && (
          <div className="flex items-center gap-2 px-1 py-0.5">
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-amber/50 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <span
              className="text-[10px] font-mono italic"
              style={{ color: "var(--color-muted)" }}
            >
              {activeTypers.length === 1
                ? `${activeTypers[0]} is typing…`
                : `${activeTypers.slice(0, -1).join(", ")} & ${activeTypers.at(-1)} are typing…`}
            </span>
          </div>
        )}
        <div ref={bottomRef} className="h-1" />
      </div>

      <div
        className="px-4 py-2.5 border-t shrink-0"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="relative">
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <input
            id="chat-input"
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Write a message…"
            maxLength={500}
            autoComplete="off"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
              color: "var(--color-text)",
            }}
            className="w-full border rounded-[var(--radius-pill)] pl-4 pr-11 py-2 text-sm font-body outline-none transition-all focus:ring-2 focus:ring-amber/25 placeholder:opacity-40"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            aria-label="Send message"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-[var(--radius-pill)] bg-amber text-void transition-all hover:bg-amber active:scale-90 disabled:opacity-0 disabled:scale-75"
          >
            <SendIcon className="w-3 h-3" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ msg, isOwn, displayNames = {} }) {
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

  if (msg.dataUrl) {
    return (
      <div
        className={`flex ${isOwn ? "flex-row-reverse" : "flex-row"} gap-2 items-end`}
      >
        {!isOwn && (
          <img
            src={`https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(name)}`}
            alt={name}
            className="w-6 h-6 shrink-0 object-contain mb-1 rounded-full bg-white/10 p-0.5"
          />
        )}
        <div
          className={`flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}
        >
          {!isOwn && (
            <span className="text-[10px] font-semibold text-amber/70 px-1">
              {name}
            </span>
          )}
          <img
            src={msg.dataUrl}
            alt="Screenshot"
            className="max-w-[220px] rounded-xl border shadow-lg"
            style={{ borderColor: "var(--color-border)" }}
          />
          <span
            className="text-[9px] font-mono px-1"
            style={{ color: "var(--color-muted)" }}
          >
            {time}
          </span>
        </div>
      </div>
    );
  }

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
        {isOwn && (
          <span className="text-[9px] font-mono text-white/40 px-0.5">
            {time}
          </span>
        )}
      </div>
    </div>
  );
}

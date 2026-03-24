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

export default function ChatPanel({
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
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="w-9 h-9 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0">
          <ChatBubbleIcon
            className="w-4 h-4 text-amber-500"
            strokeWidth={1.75}
          />
        </div>
        <div>
          <p
            className="text-[9px] font-black uppercase tracking-[0.3em]"
            style={{ color: "var(--color-muted)" }}
          >
            Live Feed
          </p>
          <p
            className="text-xs font-medium"
            style={{ color: "var(--color-text)" }}
          >
            {messages.length} messages
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 space-y-2.5"
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
                  className="w-1 h-1 rounded-full bg-amber-400/50 animate-bounce"
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

      {/* Input */}
      <div
        className="px-4 py-3.5 border-t shrink-0"
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
            className="w-full border rounded-[2rem] pl-4 pr-12 py-3 text-sm font-body outline-none transition-all focus:ring-2 focus:ring-amber-500/25 placeholder:opacity-40"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            aria-label="Send message"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-[2rem] bg-amber-500 text-void transition-all hover:bg-amber-400 active:scale-90 disabled:opacity-0 disabled:scale-75"
          >
            <SendIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
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

  // System events — centered pill with an icon prefix
  if (msg.senderId === "system") {
    const ICONS = {
      "[HOST]": (
        <CrownIcon
          className="w-3 h-3 text-amber-400 shrink-0"
          strokeWidth={2}
        />
      ),
      "[VIDEO]": (
        <FilmIcon className="w-3 h-3 text-jade shrink-0" strokeWidth={2} />
      ),
      "[SUBS]": (
        <CcIcon className="w-3 h-3 text-jade shrink-0" strokeWidth={2} />
      ),
      "[LOCK]": (
        <LockIcon className="w-3 h-3 text-amber-400 shrink-0" strokeWidth={2} />
      ),
      "[UNLOCK]": (
        <UnlockIcon className="w-3 h-3 text-jade shrink-0" strokeWidth={2} />
      ),
    };
    let icon = null,
      text = msg.text || "";
    for (const [tag, ic] of Object.entries(ICONS)) {
      if (text.includes(tag)) {
        icon = ic;
        text = text.replace(tag, "").trim();
        break;
      }
    }
    return (
      <div className="flex justify-center">
        <div
          className="px-3.5 py-1 rounded-[2rem] border text-[10px] font-mono uppercase tracking-wide flex items-center gap-1.5"
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

  // Screenshot message — image bubble
  if (msg.dataUrl) {
    return (
      <div
        className={`flex ${isOwn ? "flex-row-reverse" : "flex-row"} gap-2 items-end`}
      >
        {!isOwn && (
          <img
            src={`https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(name)}`}
            alt={name}
            className="w-7 h-7 shrink-0 object-contain"
          />
        )}
        <div
          className={`flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}
        >
          {!isOwn && (
            <span className="text-[10px] font-semibold text-amber-500/70 px-1">
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

  // Regular chat message
  return (
    <div
      className={`flex ${isOwn ? "flex-row-reverse" : "flex-row"} gap-2 items-end`}
    >
      {!isOwn && (
        <img
          src={`https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(name)}`}
          alt={name}
          className="w-7 h-7 shrink-0 object-contain"
        />
      )}
      <div
        className={`flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"} max-w-[85%]`}
      >
        {!isOwn && (
          <span className="text-[10px] font-semibold text-amber-500/70 px-1">
            {name}
          </span>
        )}
        <div
          className={`px-3.5 py-2 rounded-[2rem] text-sm leading-relaxed break-words ${isOwn ? "rounded-br-sm bg-amber-500/15" : "rounded-bl-sm"}`}
          style={
            isOwn
              ? { color: "var(--color-text)" }
              : {
                  backgroundColor: "var(--color-card)",
                  color: "var(--color-text)",
                }
          }
        >
          {msg.text}
        </div>
        <span
          className="text-[9px] font-mono px-1 mt-0.5"
          style={{ color: "var(--color-muted)" }}
        >
          {time}
        </span>
      </div>
    </div>
  );
}

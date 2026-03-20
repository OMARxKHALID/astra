"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatBubbleIcon, SendIcon, CrownIcon, FilmIcon, LockSmallIcon, UnlockSmallIcon, CcIcon } from "./Icons";

export default function ChatPanel({
  messages = [],
  userId,
  displayNames = {},
  onSend,
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const atBottomRef = useRef(true);
  const scrollRef = useRef(null);
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  }, []);

  useEffect(() => {
    if (atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function handleSubmit() {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 shrink-0">
        <div className="w-9 h-9 rounded-[2rem] bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0">
          <ChatBubbleIcon className="w-4 h-4 text-amber-500" />
        </div>
        <div>
          <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">
            Live Feed
          </p>
          <p className="text-xs font-medium text-text/70">
            {messages.length} messages
          </p>
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
        style={{ scrollbarWidth: "none" }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30">
            <ChatBubbleIcon className="w-12 h-12 text-muted" />
            <p className="text-[11px] font-mono text-muted text-center max-w-[180px] leading-relaxed uppercase tracking-wider">
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

        <div ref={bottomRef} className="h-2" />
      </div>
      <div className="px-5 py-4 border-t border-white/5 shrink-0">
        <div className="relative">
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <input
            id="chat-input"
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message…"
            maxLength={500}
            autoComplete="off"
            className="w-full bg-void/60 border border-white/6 rounded-full pl-5 pr-14 py-3.5
                       text-sm text-text placeholder:text-white/15 font-body outline-none
                       transition-all duration-200
                       focus:border-amber-500/25 focus:bg-void/90
                       focus:shadow-[0_0_0_1px_rgba(245,158,11,0.15)]"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            aria-label="Send message"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center
                       rounded-[2rem] bg-amber-500 text-void transition-all duration-150
                       hover:bg-amber-400 active:scale-90
                       disabled:opacity-0 disabled:scale-75
                       shadow-md shadow-amber-500/20"
          >
            <SendIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ msg, isOwn, displayNames = {} }) {
  const time = new Date(msg.ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const name =
    msg.senderName ||
    displayNames[msg.senderId] ||
    msg.senderId?.slice(0, 6) ||
    "???";

  if (msg.senderId === "system") {
    let icon = null;
    let cleanText = msg.text;

    if (msg.text.includes("[HOST]")) {
      icon = <CrownIcon className="w-3 h-3 text-amber-500" />;
      cleanText = msg.text.replace("[HOST]", "").trim();
    } else if (msg.text.includes("[VIDEO]")) {
      icon = <FilmIcon className="w-3 h-3 text-jade" />;
      cleanText = msg.text.replace("[VIDEO]", "").trim();
    } else if (msg.text.includes("[SUBS]")) {
      icon = <CcIcon className="w-3 h-3 text-jade" />;
      cleanText = msg.text.replace("[SUBS]", "").trim();
    } else if (msg.text.includes("[LOCK]")) {
      icon = <LockSmallIcon className="w-3 h-3 text-danger" />;
      cleanText = msg.text.replace("[LOCK]", "").trim();
    } else if (msg.text.includes("[UNLOCK]")) {
      icon = <UnlockSmallIcon className="w-3 h-3 text-jade" />;
      cleanText = msg.text.replace("[UNLOCK]", "").trim();
    }

    return (
      <div className="flex justify-center">
        <div
          className="bg-void/60 px-4 py-1.5 rounded-full border border-white/5
                        text-[10px] font-mono text-muted/70 uppercase tracking-wider
                        flex items-center gap-2"
        >
          {icon}
          {cleanText}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}
    >
      {!isOwn && (
        <span className="text-[10px] font-mono font-bold text-amber-500/40 px-1 uppercase tracking-widest">
          {name}
        </span>
      )}
      <div
        className={`max-w-[85%] px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-[2rem] text-[12px] sm:text-[13px] font-body leading-relaxed break-words border transition-colors duration-200
          ${
            isOwn
              ? "bg-amber-500 text-void border-transparent rounded-br-2xl shadow-[0_4px_12px_-4px_rgba(245,158,11,0.5)] ring-1 ring-amber-400/50"
              : "bg-white/5 border-white/6 text-white/90 rounded-bl-2xl hover:border-white/15"
          }`}
      >
        {msg.text}
      </div>
      <span className="text-[10px] font-medium text-white/50 px-1 mt-0.5">
        {time}
      </span>
    </div>
  );
}

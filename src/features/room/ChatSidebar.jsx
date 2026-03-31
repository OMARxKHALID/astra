"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle as ChatBubbleIcon,
  Send as SendIcon,
  Mic as MicIcon,
  Square as SquareIcon,
  Trash2,
} from "lucide-react";
import { ChatMessage } from "./components/ChatMessage";
import { useRecord } from "./hooks/useRecord";

export default function ChatSidebar({
  messages = [],
  userId,
  displayNames = {},
  onSend,
  typingUsers = {},
  onTyping,
}) {
  const [input, setInput] = useState("");
  const {
    isRecording,
    recordingTime,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useRecord(onSend);

  const bottomRef = useRef(null);
  const atBottomRef = useRef(true);
  const scrollRef = useRef(null);
  const typingTimerRef = useRef(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
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
            <ChatBubbleIcon className="w-10 h-10 text-muted" strokeWidth={1} />
            <p className="text-[11px] font-mono text-center max-w-[160px] leading-relaxed uppercase tracking-wider text-muted">
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
            <span className="text-[10px] font-mono italic text-muted">
              {activeTypers.length === 1
                ? `${activeTypers[0]} is typing…`
                : `${activeTypers.slice(0, -1).join(", ")} & ${activeTypers.at(-1)} are typing…`}
            </span>
          </div>
        )}
        <div ref={bottomRef} className="h-1" />
      </div>

      <div className="px-4 py-2.5 border-t border-border shrink-0">
        <div className="relative">
          {isRecording ? (
            <div className="flex items-center justify-between w-full border bg-danger/10 border-danger/20 rounded-[var(--radius-pill)] px-2 pr-11 py-2 h-[38px] overflow-hidden">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={cancelRecording}
                  aria-label="Cancel recording"
                  className="w-6 h-6 rounded-full bg-danger/10 hover:bg-danger/20 text-danger flex items-center justify-center transition-colors shadow-sm ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1.5 ml-1">
                  <span className="relative w-2 h-2 rounded-full bg-danger animate-pulse shrink-0" />
                  <span className="text-[13px] font-mono text-danger font-bold tracking-widest mt-px">
                    {Math.floor(recordingTime / 60)
                      .toString()
                      .padStart(2, "0")}
                    :{(recordingTime % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-[2px] h-3 mr-4 opacity-70">
                {[1, 2, 3, 4, 5].map((i) => {
                  const scale = Math.max(
                    0.1,
                    (audioLevel / 255) * (i % 2 === 0 ? 1 : 0.6),
                  );
                  return (
                    <span
                      key={i}
                      className="w-[2px] bg-danger rounded-full transition-all duration-75"
                      style={{ height: `${20 + scale * 80}%` }}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <>
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
                  borderColor: "var(--color-border)",
                }}
                className="w-full border bg-surface text-text rounded-[var(--radius-pill)] pl-4 pr-11 py-2 text-sm font-body outline-none transition-all focus:ring-2 focus:ring-amber/25 placeholder:opacity-40"
              />
            </>
          )}

          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
            {isRecording ? (
              <button
                onClick={stopRecording}
                aria-label="Stop recording"
                className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-pill)] bg-danger text-void transition-all hover:scale-105 active:scale-95"
              >
                <SquareIcon
                  className="w-3 h-3"
                  strokeWidth={3}
                  fill="currentColor"
                />
              </button>
            ) : (
              <div className="relative w-7 h-7">
                <button
                  onClick={startRecording}
                  disabled={Boolean(input.trim())}
                  aria-label="Record voice message"
                  className={`absolute inset-0 flex items-center justify-center rounded-full text-muted hover:text-amber transition-all duration-200 ${
                    input.trim()
                      ? "opacity-0 scale-75 pointer-events-none"
                      : "opacity-100 scale-100 cursor-pointer"
                  }`}
                >
                  <MicIcon className="w-4 h-4" strokeWidth={2} />
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-pill)] bg-amber text-void transition-all duration-200 hover:bg-amber active:scale-90 disabled:opacity-0 disabled:scale-75 disabled:pointer-events-none"
                >
                  <SendIcon className="w-3 h-3" strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

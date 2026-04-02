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
  onReaction,
  typingUsers = {},
  onTyping,
  addToast,
}) {
  const [input, setInput] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  const {
    isRecording,
    recordingTime,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useRecord(onSend, (msg) => addToast?.(msg, "error"));

  const bottomRef = useRef(null);
  const atBottomRef = useRef(true);
  const scrollRef = useRef(null);
  const typingTimerRef = useRef(null);
  const inputRef = useRef(null);

  const mentionList = [
    { id: "everyone", name: "everyone" },
    ...Object.entries(displayNames).map(([id, name]) => ({ id, name })),
  ].filter((u) => u.name.toLowerCase().includes(mentionQuery.toLowerCase()));

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  }, []);

  useEffect(() => {
    if (atBottomRef.current)
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  function selectMention(user) {
    const cursor = inputRef.current?.selectionStart || 0;
    const textBefore = input.slice(0, cursor);
    const textAfter = input.slice(cursor);
    const lastAt = textBefore.lastIndexOf("@");

    if (lastAt !== -1) {
      const newVal = `${textBefore.slice(0, lastAt)}@${user.name} ${textAfter}`;
      setInput(newVal);
      setShowMentions(false);
      // [Note] Focus preservation: timeout ensures cursor update after React render
      setTimeout(() => {
        inputRef.current?.focus();
        const newPos = lastAt + user.name.length + 2;
        inputRef.current?.setSelectionRange(newPos, newPos);
      }, 0);
    }
  }

  function handleSubmit() {
    const t = input.trim();
    if (!t) return;
    onSend(t);
    setInput("");
    setShowMentions(false);
  }

  function handleKeyDown(e) {
    if (showMentions && mentionList.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % mentionList.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(
          (prev) => (prev - 1 + mentionList.length) % mentionList.length,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectMention(mentionList[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInputChange(e) {
    const val = e.target.value;
    setInput(val);

    const cursor = e.target.selectionStart || 0;
    const textBefore = val.slice(0, cursor);
    const lastAt = textBefore.lastIndexOf("@");

    if (lastAt !== -1 && !textBefore.slice(lastAt).includes(" ")) {
      setShowMentions(true);
      setMentionQuery(textBefore.slice(lastAt + 1));
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }

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
        className="flex-1 overflow-y-auto no-scrollbar px-4 pt-6 pb-3 space-y-4"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 animate-[fadeIn_0.8s_ease-out]">
            <div className="relative">
              <ChatBubbleIcon
                className="w-9 h-9 text-white/5"
                strokeWidth={1}
              />
              <div className="absolute inset-0 bg-amber/20 blur-xl rounded-full opacity-20" />
            </div>
            <p className="text-[11px] font-mono text-center max-w-[160px] leading-relaxed uppercase tracking-[0.25em] text-white/40">
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
            onReaction={(emoji) => onReaction?.(msg.ts, emoji)}
            currentUserId={userId}
          />
        ))}

        {activeTypers.length > 0 && (
          <div className="flex items-center gap-2.5 px-2 py-1 animate-[slideUp_0.3s_ease-out]">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-amber/40 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-white/40">
              {activeTypers.length === 1
                ? `${activeTypers[0]} typing`
                : `${activeTypers.length} typing`}
            </span>
          </div>
        )}
        <div ref={bottomRef} className="h-1" />
      </div>

      <div className="px-4 py-2.5 border-t border-white/10 shrink-0">
        <div className="relative">
          {/* [Note] Mention Picker: Tactical drop-up with refined 2xl curvature for high-density UI */}
          {showMentions && mentionList.length > 0 && (
            <div className="absolute bottom-full mb-2 left-0 w-full max-w-[210px] overflow-y-auto glass-card rounded-2xl p-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 thin-scrollbar shadow-2xl border-white/10">
              <div className="px-2 py-0.5 mb-1 border-b border-white/5">
                <span className="text-[10px] font-black text-amber uppercase tracking-[0.25em]">
                  Mention Participant
                </span>
              </div>
              <div className="space-y-0.5">
                {mentionList.map((user, i) => (
                  <button
                    key={user.id}
                    onClick={() => selectMention(user)}
                    onMouseEnter={() => setMentionIndex(i)}
                    className={`w-full text-left px-2 py-1.5 rounded-xl text-[11px] transition-all flex items-center justify-between group touch-manipulation ${
                      i === mentionIndex
                        ? "bg-amber text-void font-bold shadow-lg shadow-amber/10 scale-[1.01]"
                        : "text-white/60 hover:bg-white/5"
                    }`}
                  >
                    <span className="truncate pr-2">@{user.name}</span>
                    {i === mentionIndex && (
                      <span className="text-[7px] font-black uppercase opacity-60 shrink-0">
                        Pick
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isRecording ? (
            <div className="flex items-center justify-between w-full border bg-danger/5 border-danger/10 rounded-xl px-2 pr-11 py-2 h-[38px] overflow-hidden">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={cancelRecording}
                  aria-label="Cancel recording"
                  className="w-6 h-6 rounded-lg bg-danger/10 hover:bg-danger/20 text-danger flex items-center justify-center transition-all shadow-sm ml-1 touch-manipulation"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <div className="flex items-center gap-1.5 ml-1">
                  <span className="relative w-1.5 h-1.5 rounded-full bg-danger animate-pulse shrink-0" />
                  <span className="text-[11.5px] font-mono text-danger font-bold tracking-[0.1em] mt-px">
                    {Math.floor(recordingTime / 60)
                      .toString()
                      .padStart(2, "0")}
                    :{(recordingTime % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-[1.5px] h-3 mr-4 opacity-50">
                {[1, 2, 3, 4, 5, 6].map((i) => {
                  const scale = Math.max(
                    0.1,
                    (audioLevel / 255) * (i % 2 === 0 ? 1 : 0.6),
                  );
                  return (
                    <span
                      key={i}
                      className="w-[1.5px] bg-danger rounded-full transition-all duration-75"
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
                ref={inputRef}
                id="chat-input"
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Write a message…"
                maxLength={500}
                autoComplete="off"
                className="w-full border border-white/10 bg-white/5 text-white/90 rounded-xl pl-4 pr-11 py-2 text-[12.5px] font-body outline-none transition-all focus:ring-1 focus:ring-amber/40 focus:border-amber/40 placeholder:opacity-25"
              />
            </>
          )}

          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
            {isRecording ? (
              <button
                onClick={stopRecording}
                aria-label="Stop recording"
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-danger text-void transition-all hover:scale-105 active:scale-95 touch-manipulation"
              >
                <SquareIcon
                  className="w-2.5 h-2.5"
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
                  className={`absolute inset-0 flex items-center justify-center rounded-lg text-white/20 hover:text-amber transition-all duration-200 touch-manipulation ${
                    input.trim()
                      ? "opacity-0 scale-75 pointer-events-none"
                      : "opacity-100 scale-100 cursor-pointer"
                  }`}
                >
                  <MicIcon className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className="absolute inset-0 flex items-center justify-center rounded-lg bg-amber text-void transition-all duration-200 hover:bg-amber active:scale-90 disabled:opacity-0 disabled:scale-75 disabled:pointer-events-none touch-manipulation"
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

"use client";

import { memo, useState, useRef, useEffect } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { SYSTEM_ICONS } from "../constants";
import { VoiceNote } from "./VoiceNote";
import { EXTERNAL_SERVICES } from "@/constants/config";

function ChatMessageInner({
  msg,
  isOwn,
  displayNames = {},
  onReaction,
  currentUserId,
}) {
  const REACTION_EMOJIS = ["❤️", "😂", "🔥", "👍", "😮"];
  const msgRef = useRef(null);
  const pickerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [rect, setRect] = useState(null);
  const longPressTimerRef = useRef(null);
  const isTouchSessionRef = useRef(false);
  const hideTimerRef = useRef(null);

  const cancelHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const scheduleHide = (delay = 300) => {
    cancelHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setIsHovered(false);
    }, delay);
  };

  useEffect(() => {
    if (!isHovered) return;
    const close = (e) => {
      if (pickerRef.current && pickerRef.current.contains(e.target)) return;
      if (msgRef.current && msgRef.current.contains(e.target)) return;
      setIsHovered(false);
    };
    document.addEventListener("pointerdown", close, true);
    return () => document.removeEventListener("pointerdown", close, true);
  }, [isHovered]);

  useEffect(() => {
    if (!isHovered) return;
    const hide = () => setIsHovered(false);
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [isHovered]);

  useEffect(() => {
    return () => {
      cancelHideTimer();
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const showPicker = () => {
    cancelHideTimer();
    if (!msgRef.current) return;
    setRect(msgRef.current.getBoundingClientRect());
    setIsHovered(true);
  };

  // Desktop: hover to show
  const handleMouseEnter = () => {
    if (isTouchSessionRef.current) return;
    cancelHideTimer();
    showPicker();
  };
  const handleMouseLeave = () => {
    scheduleHide(400);
  };

  // Picker hover handlers — keep picker open while mouse is over it
  const handlePickerEnter = () => cancelHideTimer();
  const handlePickerLeave = () => scheduleHide(200);

  // Mobile: long-press to show
  const handleTouchStart = () => {
    isTouchSessionRef.current = true;
    longPressTimerRef.current = setTimeout(() => {
      showPicker();
    }, 400);
  };
  const handleTouchMove = () => {
    clearTimeout(longPressTimerRef.current);
  };
  const handleTouchEnd = () => {
    clearTimeout(longPressTimerRef.current);
    setTimeout(() => {
      isTouchSessionRef.current = false;
    }, 300);
  };

  const renderTextWithMentions = (text) => {
    if (!text) return null;
    const combinedRegex = /(https?:\/\/[^\s<>"']+|@[\w-]+)/gi;
    const parts = text.split(combinedRegex);
    return parts.map((part, i) => {
      if (part.match(/https?:\/\//i)) {
        const url = part.trim();
        return (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="underline break-all cursor-pointer pointer-events-auto font-bold"
            style={{ color: isOwn ? "#000000" : "#fbbf24" }}
          >
            {url}
          </a>
        );
      }
      if (part.startsWith("@")) {
        return (
          <span
            key={i}
            className="font-bold"
            style={{ color: isOwn ? "#000000" : "#fbbf24" }}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
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

  const pickerElement =
    isHovered && rect && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={pickerRef}
            onMouseEnter={handlePickerEnter}
            onMouseLeave={handlePickerLeave}
            className="fixed flex items-center gap-0.5 p-0.5 bg-void/80 backdrop-blur-xl rounded-xl shadow-[0_30px_90px_rgba(0,0,0,0.6)] z-[999] animate-in fade-in zoom-in-95 duration-200 border border-white/10"
            style={{
              top: `${rect.top - 32}px`,
              left: isOwn ? `${rect.right - 100}px` : `${rect.left - 4}px`,
            }}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onReaction?.(emoji);
                  setIsHovered(false);
                }}
                className="w-6 h-6 flex items-center justify-center text-[14px] hover:scale-125 active:scale-95 transition-transform touch-manipulation rounded-md hover:bg-white/10"
              >
                {emoji}
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {pickerElement}
      <div
        ref={msgRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={`flex ${isOwn ? "flex-row-reverse" : "flex-row"} gap-2 group relative cursor-pointer animate-[messageIn_0.35s_cubic-bezier(0.23,1,0.32,1)]`}
      >
      <div
        className={`shrink-0 mt-0.5 transition-transform duration-300 group-hover:scale-110 ${isOwn ? "order-2" : "order-1"}`}
      >
        <div className="relative w-5 h-5 flex items-center justify-center shrink-0 select-none">
           <Image
             src={`${EXTERNAL_SERVICES.avatarService}${encodeURIComponent(name)}`}
             alt={name}
             fill
             sizes="20px"
             className="w-full h-full object-contain"
             unoptimized
           />
        </div>
      </div>
      <div
        className={`flex flex-col gap-0.5 max-w-[85%] sm:max-w-[75%] transition-all duration-300 ${isOwn ? "items-end order-1" : "items-start order-2"}`}
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
                <Image
                  src={msg.dataUrl}
                  alt="Screenshot"
                  width={300}
                  height={200}
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
            {renderTextWithMentions(msg.text)}
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
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onReaction?.(emoji);
                  }}
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
    </>
  );
}

export const ChatMessage = memo(ChatMessageInner);

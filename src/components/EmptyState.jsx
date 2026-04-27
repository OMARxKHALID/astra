"use client";

import { MessageCircle as ChatBubbleIcon } from "lucide-react";

export function EmptyState({
  icon: Icon = ChatBubbleIcon,
  title,
  description,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 animate-[fadeIn_0.5s_ease-out]">
      <div className="relative">
        <Icon className="w-10 h-10 text-white/10" strokeWidth={1} />
        <div className="absolute inset-0 bg-amber/5 blur-xl rounded-full" />
      </div>
      <p className="text-[11px] font-mono uppercase tracking-wider text-white/40 text-center max-w-[180px]">
        {title}
      </p>
      {description && (
        <p className="text-[9px] text-white/20 text-center max-w-[200px] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
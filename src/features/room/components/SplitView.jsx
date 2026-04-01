import React from "react";

export function SplitView({
  showSidebar,
  isFullscreen,
  isTheatre,
  sidebarWidth,
  onDragStart,
  urlBarContent,
  videoContent,
  chatContent,
  usersContent,
  bentoVideoRef,
  isResizing,
}) {
  return (
    <main
      className={`relative z-10 flex-1 min-h-0 min-w-0 bento-grid
        ${showSidebar ? "sidebar-open" : "sidebar-closed"}
        ${
          isFullscreen || isTheatre
            ? "!p-0 !gap-0"
            : "px-2 sm:px-4 pb-2 sm:pb-4"
        }
        ${isResizing ? "resizing" : ""}`}
      style={{ "--sidebar-width": `${sidebarWidth}px` }}
    >
      {!isFullscreen && !isTheatre && (
        <section className={`bento-url glass-card relative z-20 ${isResizing ? "pointer-events-none" : ""}`}>
          {urlBarContent}
        </section>
      )}

      <section
        ref={bentoVideoRef}
        className={`bento-video glass-card overflow-hidden ${
          isFullscreen || isTheatre ? "!rounded-none" : ""
        } ${isResizing ? "pointer-events-none" : ""}`}
      >
        {videoContent}
      </section>

      {showSidebar && !isFullscreen && !isTheatre && (
        <aside className="bento-sidebar hidden lg:flex flex-col gap-3 min-h-0 relative">
          <div
            className="absolute -left-[14px] top-0 bottom-0 w-7 cursor-col-resize z-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group"
            onMouseDown={onDragStart}
          >
            <div className="w-1.5 h-16 bg-white/10 rounded-full group-hover:bg-amber/60 transition-colors shadow-[0_0_15px_rgba(var(--color-amber-rgb), 0.3)]" />
          </div>

          <div className="glass-card flex-1 min-h-0 flex flex-col relative overflow-hidden">
            {chatContent}
          </div>

          <div className="glass-card h-[280px] shrink-0 flex flex-col overflow-hidden">
            {usersContent}
          </div>
        </aside>
      )}
    </main>
  );
}

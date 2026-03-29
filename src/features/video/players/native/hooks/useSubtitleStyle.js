import { useEffect, useRef } from "react";

export default function useSubtitleStyle(
  videoRef,
  subtitleUrl,
  showSubtitles,
  subtitleOffset,
  subStyle,
) {
  const prevOffsetRef = useRef(0);

  // Style Injection (::cue)
  useEffect(() => {
    let el = document.getElementById("sub-style-engine");
    if (!el) {
      el = document.createElement("style");
      el.id = "sub-style-engine";
      document.head.appendChild(el);
    }

    const shadowMap = {
      none: "none",
      soft: "0 0 6px rgba(0,0,0,0.9)",
      hard: "1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000",
    };

    el.innerHTML = `
      video::cue {
        background: ${subStyle.background} !important;
        color: ${subStyle.color} !important;
        font-size: ${subStyle.fontSize}% !important;
        text-shadow: ${shadowMap[subStyle.shadow || "soft"] || shadowMap.soft};
      }
      ${subStyle.position === "top" ? "video::cue-region { top: 5% !important; }" : ""}
    `;
  }, [subStyle]);

  // Track Activation
  useEffect(() => {
    if (!subtitleUrl || !showSubtitles) return;
    const v = videoRef.current;
    if (!v) return;

    const t = setTimeout(() => {
      for (const track of v.textTracks) {
        track.mode = track.label === "English" ? "showing" : "disabled";
      }
    }, 100);
    return () => clearTimeout(t);
  }, [subtitleUrl, showSubtitles, videoRef]);

  // Timing Offset (Cues)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const delta = subtitleOffset - prevOffsetRef.current;
    prevOffsetRef.current = subtitleOffset;

    for (const track of v.textTracks) {
      if (!track.cues) continue;
      for (const cue of track.cues) {
        cue.startTime = Math.max(0, cue.startTime + delta);
        cue.endTime = Math.max(0, cue.endTime + delta);
      }
    }
  }, [subtitleOffset, videoRef]);
}

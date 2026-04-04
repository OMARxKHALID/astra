import { useEffect, useRef } from "react";

export default function useSubtitleStyle(
  videoRef,
  subtitleUrl,
  showSubtitles,
  subtitleOffset,
  subStyle,
) {
  const originalTimesRef = useRef(null);

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

  // Timing Offset (Cues) — [Note] Store originals and recompute from scratch to avoid destructive clamping
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (subtitleUrl) {
      originalTimesRef.current = null;
    }

    const applyOffset = () => {
      for (const track of v.textTracks) {
        if (!track.cues || track.cues.length === 0) continue;

        if (!originalTimesRef.current) {
          originalTimesRef.current = new Map();
          for (const cue of track.cues) {
            originalTimesRef.current.set(cue, {
              start: cue.startTime,
              end: cue.endTime,
            });
          }
        }

        for (const cue of track.cues) {
          const orig = originalTimesRef.current.get(cue);
          if (!orig) continue;
          cue.startTime = Math.max(0, orig.start + subtitleOffset);
          cue.endTime = Math.max(0, orig.end + subtitleOffset);
        }
      }
    };

    const t = setTimeout(applyOffset, 150);
    return () => clearTimeout(t);
  }, [subtitleOffset, subtitleUrl, videoRef]);
}

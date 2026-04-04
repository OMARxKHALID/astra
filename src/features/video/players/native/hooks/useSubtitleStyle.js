import { useEffect, useRef, useCallback } from "react";

function parseVTT(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const cues = [];
  let i = 0;
  if (lines[0].trim().startsWith("WEBVTT")) i = 1;
  while (i < lines.length && lines[i].trim() === "") i++;

  const parseTime = (t) => {
    const parts = t.replace(",", ".").split(":");
    if (parts.length === 3) {
      return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    }
    return 0;
  };

  while (i < lines.length) {
    if (/^\d+$/.test(lines[i].trim())) {
      i++;
      continue;
    }
    const timeMatch = lines[i]?.match(/(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})/);
    if (!timeMatch) { i++; continue; }
    const start = parseTime(timeMatch[1]);
    const end = parseTime(timeMatch[2]);
    i++;
    let text = "";
    while (i < lines.length && lines[i].trim() !== "") {
      text += (text ? "\n" : "") + lines[i];
      i++;
    }
    cues.push({ start, end, text });
    i++;
  }
  return cues;
}

export default function useSubtitleStyle(
  videoRef,
  subtitleUrl,
  showSubtitles,
  subtitleOffset,
  subStyle,
) {
  const safeSubtitleUrl = subtitleUrl && typeof subtitleUrl === 'string' ? subtitleUrl : "";
  const originalTimesRef = useRef(null);
  const currentTrackRef = useRef(null);
  const loadingRef = useRef(false);
  const lastLoadedUrlRef = useRef(null);

  const loadSubtitleCues = useCallback(async (url, video) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        loadingRef.current = false;
        return;
      }
      const text = await resp.text();

      const cues = parseVTT(text);

      if (cues.length === 0) {
        loadingRef.current = false;
        return;
      }

      for (const track of video.textTracks) {
        track.mode = "disabled";
      }

      if (currentTrackRef.current) {
        try {
          video.removeTextTrack(currentTrackRef.current);
        } catch (e) {
          // old track removal may fail — proceed regardless
        }
        currentTrackRef.current = null;
      }

      const track = video.addTextTrack("subtitles", "English", "en");
      track.mode = "showing";
      currentTrackRef.current = track;

      for (const cue of cues) {
        const vttCue = new VTTCue(parseFloat(cue.start), parseFloat(cue.end), cue.text);
        track.addCue(vttCue);
      }
    } catch (e) {
      // non-critical — subtitle loading failure should not crash the player
    } finally {
      loadingRef.current = false;
    }
  }, []);

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

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const url = safeSubtitleUrl;

    if (!url || !showSubtitles) {
      if (currentTrackRef.current) {
        currentTrackRef.current.mode = "disabled";
      }
      return;
    }

    if (url === lastLoadedUrlRef.current) {
      return;
    }
    lastLoadedUrlRef.current = url;

    loadSubtitleCues(url, v);

    return () => {
      loadingRef.current = false;
    };
  }, [safeSubtitleUrl, showSubtitles, videoRef, loadSubtitleCues]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (safeSubtitleUrl) {
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
          log(`📝 Stored original times for ${track.cues.length} cues`);
        }

        for (const cue of track.cues) {
          const orig = originalTimesRef.current.get(cue);
          if (!orig) continue;
          cue.startTime = Math.max(0, orig.start + subtitleOffset);
          cue.endTime = Math.max(0, orig.end + subtitleOffset);
        }
      }
    };

    const tm = setTimeout(applyOffset, 150);
    return () => clearTimeout(tm);
  }, [subtitleOffset, safeSubtitleUrl, videoRef]);
}

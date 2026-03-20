const YT_PATTERNS = [
  /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
];

const VIMEO_PATTERNS = [
  /vimeo\.com\/(\d+)/,
  /vimeo\.com\/video\/(\d+)/,
  /player\.vimeo\.com\/video\/(\d+)/,
];

export function classifyUrl(raw) {
  if (!raw || typeof raw !== "string")
    return { type: "unsupported", url: raw || "" };
  const t = raw.trim();
  for (const p of YT_PATTERNS) {
    const m = t.match(p);
    if (m) return { type: "youtube", url: t, videoId: m[1] };
  }
  for (const p of VIMEO_PATTERNS) {
    const m = t.match(p);
    if (m) return { type: "vimeo", url: t, videoId: m[1] };
  }
  let parsed;
  try {
    parsed = new URL(t);
  } catch {
    return { type: "unsupported", url: t };
  }
  const path = parsed.pathname.toLowerCase();
  if (path.endsWith(".m3u8")) return { type: "hls", url: t };
  // Only URLs whose path ends with a known video extension are treated as
  // direct video files. Anything else (embed pages, aggregator sites, etc.)
  // returns "unsupported" so the player shows a clear error message instead
  // of a cryptic codec failure inside the native <video> element.
  if (
    path.endsWith(".mp4") ||
    path.endsWith(".webm") ||
    path.endsWith(".ogg") ||
    path.endsWith(".m4v") ||
    path.endsWith(".mov")
  )
    return { type: "mp4", url: t };
  return { type: "unsupported", url: t };
}

export const SOURCE_LABELS = {
  mp4: "Direct Video",
  hls: "HLS Stream",
  youtube: "YouTube",
  vimeo: "Vimeo",
  unsupported: "Unsupported URL",
};

const YT_PATTERNS = [
  /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
];

const VIMEO_PATTERNS = [
  /vimeo\.com\/(\d+)/,
  /vimeo\.com\/video\/(\d+)/,
  /player\.vimeo\.com\/video\/(\d+)/,
];

// Extensions recognised by the standard classifier.
const STANDARD_VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|m4v|mov)$/i;

// Extensions enforced when strictVideoUrlMode is ON.
// Wider than the standard set to match the feature spec (.mkv, .avi included).
const STRICT_VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mkv|mov|avi)$/i;

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
  if (STANDARD_VIDEO_EXTENSIONS.test(path)) return { type: "mp4", url: t };
  return { type: "unsupported", url: t };
}

/**
 * Strict video URL check used by both the server (CMD:host validation) and
 * the client (VideoUrlInput pre-flight) when strictVideoUrlMode is enabled.
 *
 * Returns true only if the URL's pathname ends with a direct video extension
 * from the strict list (.mp4, .webm, .ogg, .mkv, .mov, .avi).
 * YouTube, Vimeo, HLS, and everything else are rejected.
 */
export function isStrictVideoUrl(raw) {
  if (!raw || typeof raw !== "string") return false;
  try {
    const { pathname } = new URL(raw.trim());
    return STRICT_VIDEO_EXTENSIONS.test(pathname.toLowerCase());
  } catch {
    return false;
  }
}

export const SOURCE_LABELS = {
  mp4: "Direct Video",
  hls: "HLS Stream",
  youtube: "YouTube",
  vimeo: "Vimeo",
  unsupported: "Unsupported URL",
};

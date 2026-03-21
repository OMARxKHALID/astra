const YT_PATTERNS = [
  /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
];

const VIMEO_PATTERNS = [
  /vimeo\.com\/(\d+)/,
  /vimeo\.com\/video\/(\d+)/,
  /player\.vimeo\.com\/video\/(\d+)/,
];

// Extensions for strict mode
const STRICT_VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mkv|mov|avi)$/i;

// Extensions that definitively identify a direct video file
const KNOWN_VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|m4v|mov|mkv|avi|ts)$/i;

/**
 * Classify a URL for playback.
 *
 * Non-strict mode: Any http(s) URL is treated as a playable source.
 * Proxy URLs (e.g. ?url=...mp4...) and stream URLs are allowed.
 * The native <video> element will attempt playback and report errors itself.
 *
 * Strict mode uses isStrictVideoUrl() separately — see VideoUrlInput.
 */
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

  // Check if the pathname ends with a known video extension
  if (KNOWN_VIDEO_EXTENSIONS.test(path)) return { type: "mp4", url: t };

  // Check decoded query parameters — catches proxy URLs like
  // /proxy?url=https://...video.mp4?sign=...
  try {
    const decodedQuery = decodeURIComponent(parsed.search);
    if (decodedQuery.includes(".m3u8")) return { type: "hls", url: t };
    if (KNOWN_VIDEO_EXTENSIONS.test(decodedQuery))
      return { type: "mp4", url: t };
  } catch {}

  // Any http(s) URL is treated as a direct video file.
  // The <video> element will attempt playback and show a proper error if it fails.
  // This is intentional: proxy URLs, signed CDN URLs, etc. all lack file extensions.
  if (parsed.protocol === "https:" || parsed.protocol === "http:")
    return { type: "mp4", url: t };

  return { type: "unsupported", url: t };
}

/**
 * Strict video URL check — used only when strictVideoUrlMode is enabled.
 * Only direct file extensions are accepted; proxy/CDN URLs are rejected.
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

const YT_PATTERNS = [
  /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
];

const VIMEO_PATTERNS = [
  /vimeo\.com\/(\d+)/,
  /vimeo\.com\/video\/(\d+)/,
  /player\.vimeo\.com\/video\/(\d+)/,
];

const EMBED_DOMAINS = [
  "vidlink.pro",
  "vidsrc.to",
  "vidsrc.me",
  "autoembed.cc",
  "2embed.cc",
  "www.2embed.cc",
  "multiembed.mov",
  "embed.su",
  "smashystream.com",
  "player.videasy.net",
  "superembed.stream",
  "moviesapi.club",
  "moviesapi.to",
  "player.smashy.stream",
];

import { KNOWN_VIDEO_EXTENSIONS, isStrictVideoUrl } from "@/utils/videoValidation";

export { isStrictVideoUrl };

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

  const hostname = parsed.hostname.replace(/^www\./, "");
  if (EMBED_DOMAINS.some((d) => d.replace(/^www\./, "") === hostname))
    return { type: "embed", url: t };

  const path = parsed.pathname.toLowerCase();
  if (path.endsWith(".m3u8")) return { type: "hls", url: t };
  if (KNOWN_VIDEO_EXTENSIONS.test(path)) return { type: "mp4", url: t };

  try {
    const decoded = decodeURIComponent(parsed.search);
    if (decoded.includes(".m3u8")) return { type: "hls", url: t };
    if (KNOWN_VIDEO_EXTENSIONS.test(decoded)) return { type: "mp4", url: t };
  } catch {}

  return { type: "unsupported", url: t };
}

export const SOURCE_LABELS = {
  mp4: "Direct Video",
  hls: "HLS Stream",
  youtube: "YouTube",
  vimeo: "Vimeo",
  embed: "Embed Player",
  unsupported: "Unsupported URL",
};

export function buildEmbedUrl(server, tmdbId, type, season = 1, episode = 1) {
  const isTV = type === "tv";
  switch (server) {
    case "vidlink":
      return isTV
        ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=f59e0b&autoplay=true`
        : `https://vidlink.pro/movie/${tmdbId}?primaryColor=f59e0b&autoplay=true`;
    case "vidsrc":
      return isTV
        ? `https://vidsrc.to/embed/tv/${tmdbId}/${season}-${episode}`
        : `https://vidsrc.to/embed/movie/${tmdbId}`;
    case "autoembed":
      return isTV
        ? `https://autoembed.cc/tv/tmdb/${tmdbId}-${season}-${episode}`
        : `https://autoembed.cc/movie/tmdb/${tmdbId}`;
    case "embed2":
      return isTV
        ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`
        : `https://www.2embed.cc/embed/${tmdbId}`;
    case "superembed":
      return isTV
        ? `https://www.superembed.stream/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`
        : `https://www.superembed.stream/?video_id=${tmdbId}&tmdb=1`;
    case "moviesapi":
      return isTV
        ? `https://moviesapi.club/tv/${tmdbId}-${season}-${episode}`
        : `https://moviesapi.club/movie/${tmdbId}`;
    case "embedsu":
      return isTV
        ? `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://embed.su/embed/movie/${tmdbId}`;
    case "smashy":
      return isTV
        ? `https://player.smashy.stream/tv/${tmdbId}?s=${season}&e=${episode}`
        : `https://player.smashy.stream/movie/${tmdbId}`;
    default:
      return null;
  }
}

export const serverOptions = [
  { label: "Vidlink (Ad-Free, Fast)", value: "vidlink" },
  { label: "Vidsrc", value: "vidsrc" },
  { label: "AutoEmbed", value: "autoembed" },
  { label: "2Embed", value: "embed2" },
  { label: "SuperEmbed", value: "superembed" },
  { label: "MoviesAPI", value: "moviesapi" },
  { label: "Embed.su", value: "embedsu" },
  { label: "SmashyStream", value: "smashy" },
];

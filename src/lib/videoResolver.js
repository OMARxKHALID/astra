import {
  KNOWN_VIDEO_EXTENSIONS,
  isStrictVideoUrl,
} from "@/utils/videoValidation";

const YT_PATTERNS = [
  /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
];

const VIMEO_PATTERNS = [
  /vimeo\.com\/(\d+)/,
  /vimeo\.com\/video\/(\d+)/,
  /player\.vimeo\.com\/video\/(\d+)/,
];

// Single source of truth for embed servers — used by both classifyUrl and detectServer
const SERVER_DOMAINS = {
  vidlink: ["vidlink.pro"],
  superembed: ["multiembed.mov", "streamingnow.mov", "superembed.stream"],
  moviesapi: ["moviesapi.to", "moviesapi.club"],
};

const EMBED_DOMAINS = Object.values(SERVER_DOMAINS).flat();

export { isStrictVideoUrl };

const PROXY_DOMAINS = [
  "proxy.valhallastream.dpdns.org",
  "proxy.valhallastream",
  "proxy.",
  "cdn.proxy",
  "streamproxy",
];

export function classifyUrl(raw) {
  if (!raw || typeof raw !== "string")
    return { type: "unsupported", url: raw || "" };
  const t = raw.trim();

  // Handle blob: URLs (local file uploads)
  if (t.startsWith("blob:")) {
    return { type: "mp4", url: t };
  }

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
  
  // Check if it's a proxy URL that needs to be converted
  const isProxyUrl = PROXY_DOMAINS.some(d => hostname.includes(d));
  const proxyParams = ["url", "video", "src", "file", "path"];
  const hasProxyParam = proxyParams.some(p => parsed.searchParams.has(p));
  
  if (isProxyUrl && hasProxyParam) {
    // Extract the inner URL from the proxy and route through our internal proxy
    const innerUrlParam = proxyParams.find(p => parsed.searchParams.get(p));
    const innerUrl = parsed.searchParams.get(innerUrlParam);
    if (innerUrl) {
      try {
        const decodedInnerUrl = decodeURIComponent(innerUrl);
        const appUrl = typeof window !== "undefined" 
          ? window.location.origin 
          : "http://localhost:3000";
        const proxiedUrl = `${appUrl}/api/proxy?url=${encodeURIComponent(decodedInnerUrl)}`;
        return { type: "mp4", url: proxiedUrl };
      } catch (e) {
        // fail silently — will fall through to default classification
      }
    }
  }

  if (hostname.endsWith(".workers.dev") && parsed.pathname.startsWith("/vid/"))
    return { type: "hls", url: t };
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

  // unrecognized http/https URL — send to native player for direct src attempt
  return { type: "direct", url: t };
}

export const SOURCE_LABELS = {
  mp4: "Direct Video",
  hls: "HLS Stream",
  direct: "Custom URL",
  youtube: "YouTube",
  vimeo: "Vimeo",
  embed: "Embed Player",
  unsupported: "Unsupported URL",
};

export function extractMeta(rawUrl) {
  if (!rawUrl) return { id: "", s: "1", e: "1", type: "movie" };
  
  // Strip query params for path matching, but keep the full URL for param search
  const url = rawUrl.split("?")[0].split("#")[0];
  let urlObj = null;
  try { urlObj = new URL(rawUrl); } catch { /* not a valid URL */ }

  // 1. Vidlink: /tv/id/s/e or /movie/id
  if (url.includes("vidlink.pro")) {
    const vidlinkMatch = url.match(/\/(tv|movie)\/(\d+)/);
    if (vidlinkMatch) {
      const isTV = vidlinkMatch[1] === "tv";
      const segments = url.split("/").filter(Boolean);
      return {
        id: vidlinkMatch[2],
        s: isTV ? (segments[segments.length - 2] || "1") : "1",
        e: isTV ? (segments[segments.length - 1] || "1") : "1",
        type: vidlinkMatch[1],
      };
    }
  }

  // 2. SuperEmbed: ?video_id=id&tmdb=1
  if (urlObj && (url.includes("multiembed.mov") || url.includes("superembed") || url.includes("streamingnow.mov"))) {
    const vId = urlObj.searchParams.get("video_id");
    if (vId && urlObj.searchParams.get("tmdb") === "1") {
      const s = urlObj.searchParams.get("s");
      const e = urlObj.searchParams.get("e");
      return {
        id: vId,
        s: s || "1",
        e: e || "1",
        type: s ? "tv" : "movie",
      };
    }
  }

  // 3. MoviesAPI: /tv/id-s-e or /movie/id
  const apiMatch = url.match(/\/(?:moviesapi\.(?:to|club)|streamingnow\.mov)\/(tv|movie)\/(\d+)(?:-(\d+)-(\d+))?/);
  if (apiMatch) {
    return {
      id: apiMatch[2],
      s: apiMatch[3] || "1",
      e: apiMatch[4] || "1",
      type: apiMatch[1],
    };
  }

  // Fallback for custom URLs with tmdb= param
  if (urlObj) {
    const qId = urlObj.searchParams.get("tmdb");
    const qS = urlObj.searchParams.get("s");
    const qE = urlObj.searchParams.get("e");
    const qType = urlObj.searchParams.get("type");
    if (qId) return { id: qId, s: qS || "1", e: qE || "1", type: qType || "movie" };
  }

  return { id: "", s: "1", e: "1", type: "movie" };
}

export function buildEmbedUrl(server, tmdbId, type, season = 1, episode = 1) {
  const isTV = type === "tv";
  switch (server) {
    case "vidlink":
      return isTV
        ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=f59e0b&autoplay=true`
        : `https://vidlink.pro/movie/${tmdbId}?primaryColor=f59e0b&autoplay=true`;
    case "superembed":
      return isTV
        ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`
        : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`;
    case "moviesapi":
      return isTV
        ? `https://moviesapi.to/tv/${tmdbId}-${season}-${episode}`
        : `https://moviesapi.to/movie/${tmdbId}`;
    default:
      return null;
  }
}

export function detectServer(url) {
  if (!url) return null;
  let host;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\.|^player\.|^embed\./, "");
  } catch {
    return null;
  }

  for (const [server, domains] of Object.entries(SERVER_DOMAINS)) {
    if (domains.some(d => {
      const normalizedD = d.replace(/^www\.|^player\.|^embed\./, "");
      return host === normalizedD || host.endsWith("." + normalizedD);
    })) {
      return server;
    }
  }

  return null;
}

export const serverOptions = [
  { label: "Vidlink (Ad-Free, Fast)", value: "vidlink" },
  { label: "SuperEmbed", value: "superembed" },
  { label: "MoviesAPI", value: "moviesapi" },
];

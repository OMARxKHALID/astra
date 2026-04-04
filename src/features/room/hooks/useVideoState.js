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
  "cflul.x9l.workers.dev",
];

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  KNOWN_VIDEO_EXTENSIONS,
  isStrictVideoUrl,
} from "@/utils/videoValidation";

export { isStrictVideoUrl };

export function useVideoState({ videoUrl, params, roomId, router, sendRef }) {
  const [episodesOpen, setEpisodesOpen] = useState(false);
  const [seasonCache, setSeasonCache] = useState({});

  const parsed = useMemo(() => {
    const id = params?.get("tmdb") || "";
    const type = params?.get("type") || "movie";
    const s = parseInt(params?.get("s") || "1", 10);
    const e = parseInt(params?.get("e") || "1", 10);
    return { id, type, s, e };
  }, [params]);

  const isActiveTv = parsed.type === "tv" && !!parsed.id;

  const handleSelectEpisode = useCallback(
    ({ season, episode }) => {
      if (!parsed.id) return;
      const newUrl = buildEmbedUrl(
        "vidlink",
        parsed.id,
        "tv",
        season,
        episode,
      );
      if (newUrl && sendRef?.current) {
        sendRef.current({
          type: "change_video",
          videoUrl: newUrl,
          subtitleUrl: "",
        });
      }
    },
    [parsed.id, sendRef],
  );

  return {
    videoUrl,
    isActiveTv,
    episodesOpen,
    setEpisodesOpen,
    id: parsed.id,
    s: parsed.s,
    e: parsed.e,
    handleSelectEpisode,
    seasonCache,
    setSeasonCache,
  };
}

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

  // [Note] Only http/https are playable; blob/data/other schemes are unsupported
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { type: "unsupported", url: t };
  }

  const hostname = parsed.hostname.replace(/^www\./, "");

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

  // [Note] Valid http/https URL with no recognized pattern: send to native player
  // for a direct src attempt. Browser will negotiate content-type via response headers.
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

// [Note] Reverse-lookup: hostname split fails for www./player./embed. prefixes; match against known server URL patterns instead
export function detectServer(url) {
  if (!url) return null;
  let urlHost;
  try {
    urlHost = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const opt of serverOptions) {
    // Build a test URL for each server and compare hostnames
    const testUrl = buildEmbedUrl(opt.value, "1", "movie");
    if (!testUrl) continue;
    try {
      const testHost = new URL(testUrl).hostname.toLowerCase();
      if (
        urlHost === testHost ||
        urlHost.endsWith("." + testHost) ||
        testHost.endsWith("." + urlHost)
      ) {
        return opt.value;
      }
    } catch {}
  }
  return null;
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

import { apiResponse } from "@/utils/apiResponse";

export async function GET(request) {
  try {
    const secret = request.headers.get("x-admin-secret");
    const configuredSecret = process.env.ADMIN_SECRET;
    
    if (!configuredSecret || secret !== configuredSecret) {
       return apiResponse.unauthorized("Authentication required");
    }

    const [tmdbResult, youtubeResult, opensubtitlesResult] = await Promise.all([
      checkTMDB(),
      checkYouTube(),
      checkOpenSubtitles(),
    ]);
    
    return apiResponse.success({
      tmdb: tmdbResult,
      youtube: youtubeResult,
      opensubtitles: opensubtitlesResult,
    });
  } catch (err) {
    return apiResponse.internalError(err.message);
  }
}

async function checkTMDB() {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return { status: "not_configured", message: "API key missing" };
  
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/configuration?api_key=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    return res.ok
      ? { status: "ok", message: "API accessible" }
      : { status: "error", message: `HTTP ${res.status}` };
  } catch (err) {
    return err.name === "TimeoutError"
      ? { status: "timeout", message: "Request timed out" }
      : { status: "error", message: err.message };
  }
}

async function checkYouTube() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { status: "not_configured", message: "API key missing" };
  
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=Ks-_Mh1QhMc&part=snippet&key=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    return res.ok
      ? { status: "ok", message: "API accessible" }
      : { status: "error", message: `HTTP ${res.status}` };
  } catch (err) {
    return err.name === "TimeoutError"
      ? { status: "timeout", message: "Request timed out" }
      : { status: "error", message: err.message };
  }
}

async function checkOpenSubtitles() {
  const apiKey = process.env.OPENSUBTITLES_KEY;
  if (!apiKey) return { status: "not_configured", message: "API key missing" };
  
  try {
    const res = await fetch(
      "https://api.opensubtitles.com/api/v1/infos/formats",
      {
        headers: {
          "Api-Key": apiKey,
          "User-Agent": "Astra v1"
        },
        signal: AbortSignal.timeout(5000)
      }
    );
    // [Note] 401/403 means the key exists but is invalid — API is still reachable
    return res.ok || res.status === 401 || res.status === 403
      ? { status: "ok", message: "API accessible" }
      : { status: "error", message: `HTTP ${res.status}` };
  } catch (err) {
    return err.name === "TimeoutError"
      ? { status: "timeout", message: "Request timed out" }
      : { status: "error", message: err.message };
  }
}
import { apiResponse } from "@/utils/apiResponse";
import { withRateLimit } from "@/lib/rateLimit";
import { isValidUrl } from "@/lib/ssrf";

const API_KEY = process.env.OPENSUBTITLES_KEY;
const API_BASE = "https://api.opensubtitles.com/api/v1";

// [Note] OpenSubtitles Hash algorithm: block-checksum of first and last 64KB + file size
function computeHash(buffer, size) {
    let hash = BigInt(size);
    const view = new DataView(buffer);
    for (let i = 0; i < 65536; i += 8) {
        hash = (hash + view.getBigUint64(i, true)) & 0xFFFFFFFFFFFFFFFFn;
    }
    for (let i = 65536; i < 131072; i += 8) {
        hash = (hash + view.getBigUint64(i, true)) & 0xFFFFFFFFFFFFFFFFn;
    }
    return hash.toString(16).padStart(16, "0");
}



export async function GET(request) {
  try {
    const limited = await withRateLimit(request, { key: "subtitles:search", requests: 20, window: "1 m" });
    if (limited) return limited;

    if (!API_KEY) {
      return apiResponse.success({ title: "Unknown", subtitles: [] });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.slice(0, 200) || "";
    const videoUrl = searchParams.get("url")?.slice(0, 500) || "";

    let results = [];
    let movieTitle = "Unknown";

    const headers = {
        "Api-Key": API_KEY,
        "User-Agent": "Astra v1",
        "Content-Type": "application/json"
    };

    if (videoUrl && (await isValidUrl(videoUrl))) {
        try {
            const headResp = await fetch(videoUrl, { method: "HEAD", signal: AbortSignal.timeout(10000) });
            if (!headResp.ok) throw new Error(`HEAD request failed: ${headResp.status}`);
            const size = parseInt(headResp.headers.get("content-length") || "0");
            
            if (size > 131072 && size < 500_000_000) { // [Note] limit hash computation to files under 500MB to save memory/bandwidth
                const [startResp, endResp] = await Promise.all([
                  fetch(videoUrl, { headers: { Range: "bytes=0-65535" }, signal: AbortSignal.timeout(15000) }),
                  fetch(videoUrl, { headers: { Range: `bytes=${size - 65536}-${size - 1}` }, signal: AbortSignal.timeout(15000) })
                ]);
                const startBuf = await startResp.arrayBuffer();
                const endBuf = await endResp.arrayBuffer();
                
                const combined = new Uint8Array(131072);
                combined.set(new Uint8Array(startBuf), 0);
                combined.set(new Uint8Array(endBuf), 65536);
                
                const hash = computeHash(combined.buffer, size);
                
                const searchRes = await fetch(`${API_BASE}/subtitles?moviehash=${hash}&languages=en`, { headers, signal: AbortSignal.timeout(10000) });
                const data = await searchRes.json();
                
                if (data.data) {
                    results = data.data
                        .filter(s => s.attributes.files?.[0]?.file_id)
                        .map(s => ({
                            id: s.id,
                            label: s.attributes.release || s.attributes.feature_details?.title || "Unknown",
                            url: s.attributes.files[0].file_id
                        }));
                }
            }
        } catch {
          // [Note] hash search failed — proceed to fallback
        }
    }

    if (results.length === 0 && query) {
        const searchRes = await fetch(`${API_BASE}/subtitles?query=${encodeURIComponent(query)}&languages=en`, { headers, signal: AbortSignal.timeout(10000) });
        const data = await searchRes.json();
        
        if (data.data) {
            results = data.data
                .filter(s => s.attributes.files?.[0]?.file_id)
                .map(s => ({
                    id: s.id,
                    label: s.attributes.release || s.attributes.feature_details?.title || "Unknown",
                    url: s.attributes.files[0].file_id
                }));
        }
    }

    if (results.length === 0 && query) {
        const cinemetaUrl = `https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURIComponent(query)}.json`;
        const cRes = await fetch(cinemetaUrl, { signal: AbortSignal.timeout(5000) });
        const cData = await cRes.json();
        
        if (cData.metas && cData.metas.length > 0) {
            movieTitle = cData.metas[0].name;
            const imdbId = cData.metas[0].imdb_id;
            const osUrl = `https://opensubtitles-v3.strem.io/subtitles/movie/${imdbId}.json`;
            const sRes = await fetch(osUrl, { signal: AbortSignal.timeout(5000) });
            const sData = await sRes.json();
            
            if (sData.subtitles) {
                const engSubs = sData.subtitles.filter(s => 
                    s.lang === "eng" || s.lang === "en" || s.lang.toLowerCase().includes("english")
                );
                results = engSubs.slice(0, 10).map((s, index) => ({
                    id: s.id || `strem_${index}`,
                    label: `${movieTitle} - Track ${index + 1} (Proxy)`,
                    url: s.url
                }));
            }
        }
    }

    return apiResponse.success({
      title: movieTitle,
      subtitles: results,
    });
  } catch (err) {
    return apiResponse.error(
      err.message || "Subtitle search failed",
      500,
      "SUBTITLE_SEARCH_ERROR",
    );
  }
}

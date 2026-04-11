export async function computeOpenSubtitlesHash(videoUrl) {
  try {
    const response = await fetch(videoUrl, {
      headers: { Range: "bytes=0-65535" },
    });
    if (!response.ok) return null;
    const startBuffer = await response.arrayBuffer();
    const contentRange = response.headers.get("content-range");
    const fileSize = contentRange
      ? parseInt(contentRange.split("/")[1], 10)
      : parseInt(response.headers.get("content-length"), 10);
    if (!fileSize) return null;
    const endResponse = await fetch(videoUrl, {
      headers: { Range: `bytes=${Math.max(0, fileSize - 65536)}-` },
    });
    if (!endResponse.ok) return null;
    const endBuffer = await endResponse.arrayBuffer();
    const hash = openSubtitlesHash(startBuffer, endBuffer, fileSize);
    return hash;
  } catch (e) {
    return null;
  }
}

function openSubtitlesHash(startBuffer, endBuffer, fileSize) {
  const start = new DataView(startBuffer);
  const end = new DataView(endBuffer);
  let hash = fileSize;
  for (let i = 0; i < Math.min(startBuffer.byteLength, 8192); i += 4) {
    const value = start.getUint32(i, true);
    hash = (hash + value) >>> 0;
  }
  const startPos = Math.max(0, endBuffer.byteLength - 8192);
  for (let i = startPos; i < endBuffer.byteLength; i += 4) {
    const value = end.getUint32(i, true);
    hash = (hash + value) >>> 0;
  }
  return hash.toString(16).padStart(16, "0");
}

export async function searchSubtitles(hash) {
  try {
    const response = await fetch(`/api/subtitles/search?hash=${hash}&lang=en`);
    if (!response.ok) throw new Error(`Search API returned ${response.status}`);
    const json = await response.json();
    const results = json.success ? json.data?.subtitles || [] : [];
    return results;
  } catch (e) {
    return [];
  }
}

export async function downloadSubtitle(fileId) {
  try {
    const response = await fetch("/api/subtitles/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: fileId }),
    });
    if (!response.ok) throw new Error(`Download API returned ${response.status}`);
    const text = await response.text();
    return text;
  } catch (e) {
    return "";
  }
}

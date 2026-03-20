import { NextResponse } from "next/server";

const API_KEY = process.env.OPENSUBTITLES_KEY || "Zff4vJKGx6hFiW02ouPLV1iXQCB3VjL1";
const API_BASE = "https://api.opensubtitles.com/api/v1";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const subUrlOrId = searchParams.get("url");

    if (!subUrlOrId) {
      return NextResponse.json({ error: "Missing 'url' or 'id' parameter" }, { status: 400 });
    }

    let finalDownloadUrl = subUrlOrId;

    // 1. If it's a numeric ID (OpenSubtitles v1 file_id), we need to request the download link
    if (!isNaN(subUrlOrId)) {
        try {
            const dlRes = await fetch(`${API_BASE}/download`, {
                method: "POST",
                headers: {
                    "Api-Key": API_KEY,
                    "User-Agent": "WatchTogether v1",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ file_id: parseInt(subUrlOrId) })
            });
            const dlData = await dlRes.json();
            if (dlData.link) {
                finalDownloadUrl = dlData.link;
            } else {
                throw new Error("No download link returned from OpenSubtitles.");
            }
        } catch (err) {
            console.error("[subtitles] OS Download request failed:", err.message);
            return NextResponse.json({ error: "Failed to request download link from OpenSubtitles" }, { status: 500 });
        }
    }

    // 2. Download the subtitle file
    const res = await fetch(finalDownloadUrl);
    if (!res.ok) throw new Error("Failed to download raw subtitle file.");
    
    const contentType = res.headers.get("content-type") || "";
    const isVtt = finalDownloadUrl.endsWith(".vtt") || contentType.includes("vtt");
    
    let rawText = "";
    if (isVtt) {
        const vttData = await res.arrayBuffer();
        return new NextResponse(vttData, {
          status: 200,
          headers: {
            "Content-Type": "text/vtt; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*"
          }
        });
    }

    // 3. Robust Conversion (SRT -> VTT)
    rawText = await res.text();
    const vttText = "WEBVTT\n\n" + rawText
        .trim()
        .replace(/\r\n/g, "\n")
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");

    return new NextResponse(vttText, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    console.error("[subtitles] Download/Proxy error:", err);
    return NextResponse.json({ error: "Subtitle proxy failed", details: err.message }, { status: 500 });
  }
}

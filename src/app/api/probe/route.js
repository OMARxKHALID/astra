import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "Missing url parameter" },
        { status: 400 },
      );
    }

    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(10000),
    });

    return NextResponse.json({
      contentType: res.headers.get("content-type") || "",
      contentLength: res.headers.get("content-length") || "",
      status: res.status,
      ok: res.ok,
    });
  } catch (err) {
    return NextResponse.json(
      { contentType: "", error: err.message },
      { status: 200 },
    );
  }
}

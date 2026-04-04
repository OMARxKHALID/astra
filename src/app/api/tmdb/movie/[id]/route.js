import { NextResponse } from "next/server";
import { getMovieDetails } from "@/services/tmdbDetails";

const VALID_ID_PATTERN = /^\d+$/;

export async function GET(req, { params }) {
  const { id } = await params;
  if (!id || !VALID_ID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const data = await getMovieDetails(id);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getTVDetails } from "@/services/tmdbDetails";

export async function GET(req, { params }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const data = await getTVDetails(id);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

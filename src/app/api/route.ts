import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ app: "Horivoo", version: "1.0.0" });
}

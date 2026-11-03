import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await sql`select 1`;
    return NextResponse.json({
      status: "ok",
      database: "ok",
      time: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "degraded", database: "error" },
      { status: 503 },
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@atlas/db/client";
import { isDemoMode } from "@/lib/demo-store";

export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({
      status: "ok",
      mode: "demo",
      database: "not-required",
    });
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      mode: "staging",
      database: "reachable",
    });
  } catch {
    return NextResponse.json(
      { status: "error", mode: "staging", database: "unreachable" },
      { status: 503 },
    );
  }
}

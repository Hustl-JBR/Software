import { NextResponse } from "next/server";
import { z } from "zod";
import { locationProvider } from "@/lib/providers";
import {
  recordProviderUsage,
  requireProviderContext,
} from "@/lib/provider-request";

const requestSchema = z.object({
  placeId: z.string().trim().min(5).max(300),
  sessionToken: z.string().uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const startedAt = Date.now();
  try {
    const { slug } = await params;
    const context = await requireProviderContext(slug);
    const input = requestSchema.parse(await request.json());
    const provider = locationProvider();
    if (!provider.available)
      return NextResponse.json(
        { error: "PROVIDER_UNAVAILABLE" },
        { status: 503 },
      );
    const location = await provider.resolve(input.placeId, input.sessionToken);
    await recordProviderUsage({
      ...context,
      provider: provider.name,
      operation: "PLACE_DETAILS",
      outcome: "SUCCESS",
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ location });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status =
      message === "UNAUTHORIZED"
        ? 401
        : message === "NOT_FOUND"
          ? 404
          : message === "RATE_LIMITED"
            ? 429
            : 400;
    return NextResponse.json(
      { error: "LOCATION_RESOLUTION_FAILED" },
      { status },
    );
  }
}

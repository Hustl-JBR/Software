import { NextResponse } from "next/server";
import { z } from "zod";
import { locationProvider } from "@/lib/providers";
import {
  recordProviderUsage,
  requireProviderContext,
} from "@/lib/provider-request";

const requestSchema = z.object({
  input: z.string().trim().min(3).max(200),
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
        { available: false, provider: provider.name, suggestions: [] },
        { status: 503 },
      );
    const suggestions = await provider.autocomplete(
      input.input,
      input.sessionToken,
    );
    await recordProviderUsage({
      ...context,
      provider: provider.name,
      operation: "PLACE_AUTOCOMPLETE",
      outcome: "SUCCESS",
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ available: true, suggestions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status =
      message === "UNAUTHORIZED"
        ? 401
        : message === "NOT_FOUND"
          ? 404
          : message === "RATE_LIMITED"
            ? 429
            : message === "LOCATION_PROVIDER_UNAVAILABLE"
              ? 503
              : 400;
    return NextResponse.json({ error: "LOCATION_SEARCH_FAILED" }, { status });
  }
}

import { describe, expect, it, vi } from "vitest";
import {
  DeterministicMockLocationProvider,
  GoogleLocationProvider,
} from "../../packages/integrations/location";
import {
  DeterministicMockRoutingProvider,
  GENERAL_ROAD_WARNING,
  GoogleRoutingProvider,
} from "../../packages/integrations/routing";

const nashville = {
  provider: "fixture",
  placeId: "nashville-warehouse",
  name: "Nashville Warehouse",
  addressLine1: "100 Commerce St",
  city: "Nashville",
  state: "TN",
  postalCode: "37201",
  countryCode: "US",
  formattedAddress: "100 Commerce St, Nashville, TN 37201",
  latitude: 36.1627,
  longitude: -86.7816,
  timeZone: "America/Chicago",
  validationStatus: "VALIDATED" as const,
};

describe("location providers", () => {
  it("offers deterministic suggestions without network access", async () => {
    const provider = new DeterministicMockLocationProvider([nashville]);
    expect(await provider.autocomplete("commerce", "unused")).toEqual([
      expect.objectContaining({ placeId: "nashville-warehouse" }),
    ]);
    expect(
      await provider.resolve("nashville-warehouse", "unused"),
    ).toMatchObject({
      provider: "deterministic-mock",
      timeZone: "America/Chicago",
    });
  });

  it("uses narrow Google fields and never puts the server key in the URL", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            suggestions: [
              {
                placePrediction: {
                  placeId: "google-place-1",
                  text: { text: "Warehouse, Nashville, TN" },
                },
              },
            ],
          }),
          { status: 200 },
        ),
    );
    const provider = new GoogleLocationProvider(
      "server-secret",
      fetcher as typeof fetch,
    );
    await provider.autocomplete("ware", "550e8400-e29b-41d4-a716-446655440000");
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).not.toContain("server-secret");
    expect(init?.headers).toMatchObject({
      "X-Goog-Api-Key": "server-secret",
      "X-Goog-FieldMask": expect.stringContaining("placeId"),
    });
  });
});

describe("routing providers", () => {
  it("labels deterministic output as a general estimate", async () => {
    const route = await new DeterministicMockRoutingProvider().calculate([
      { latitude: 36.1627, longitude: -86.7816 },
      { latitude: 33.749, longitude: -84.388 },
    ]);
    expect(route.distanceMeters).toBeGreaterThan(300_000);
    expect(route.routeType).toBe("GENERAL_ROAD_ESTIMATE");
    expect(route.warning).toBe(GENERAL_ROAD_WARNING);
  });

  it("requests only distance, duration, and encoded geometry from Google", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            routes: [
              {
                distanceMeters: 400_000,
                duration: "14400s",
                polyline: { encodedPolyline: "abc" },
              },
            ],
          }),
          { status: 200 },
        ),
    );
    const route = await new GoogleRoutingProvider(
      "server-secret",
      fetcher as typeof fetch,
    ).calculate([
      { latitude: 36.1627, longitude: -86.7816 },
      { latitude: 33.749, longitude: -84.388 },
    ]);
    expect(route.warning).toBe(GENERAL_ROAD_WARNING);
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({
      "X-Goog-FieldMask":
        "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
    });
  });
});

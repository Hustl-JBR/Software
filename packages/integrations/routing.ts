import { z } from "zod";

export const GENERAL_ROAD_WARNING =
  "General road estimate only — not truck-legal or commercial vehicle routing.";

export type RoutePoint = { latitude: number; longitude: number };
export type RouteEstimate = {
  provider: string;
  providerVersion: string;
  routeType: "GENERAL_ROAD_ESTIMATE";
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline?: string;
  calculatedAt: Date;
  warning: typeof GENERAL_ROAD_WARNING;
};

export interface RoutingProvider {
  readonly name: string;
  readonly available: boolean;
  calculate(stops: RoutePoint[]): Promise<RouteEstimate>;
}

export class ProviderUnavailableRoutingProvider implements RoutingProvider {
  readonly name = "disabled";
  readonly available = false;
  async calculate(): Promise<RouteEstimate> {
    throw new Error("ROUTING_PROVIDER_UNAVAILABLE");
  }
}

export class DeterministicMockRoutingProvider implements RoutingProvider {
  readonly name = "deterministic-mock";
  readonly available = true;
  async calculate(stops: RoutePoint[]): Promise<RouteEstimate> {
    if (stops.length < 2) throw new Error("ROUTE_REQUIRES_TWO_STOPS");
    const distanceMeters = Math.round(
      stops.slice(1).reduce((total, stop, index) => {
        return total + haversine(stops[index], stop);
      }, 0) * 1.18,
    );
    return {
      provider: this.name,
      providerVersion: "deterministic-haversine-v1",
      routeType: "GENERAL_ROAD_ESTIMATE",
      distanceMeters,
      durationSeconds: Math.round(distanceMeters / 24.5872),
      calculatedAt: new Date("2026-01-01T00:00:00.000Z"),
      warning: GENERAL_ROAD_WARNING,
    };
  }
}

const googleRouteResponse = z.object({
  routes: z.array(
    z.object({
      distanceMeters: z.number().int().nonnegative(),
      duration: z.string().regex(/^\d+(?:\.\d+)?s$/),
      polyline: z.object({ encodedPolyline: z.string() }).optional(),
    }),
  ),
});

export class GoogleRoutingProvider implements RoutingProvider {
  readonly name = "google";
  readonly available = true;
  constructor(
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    if (!apiKey) throw new Error("GOOGLE_MAPS_SERVER_API_KEY_REQUIRED");
  }
  async calculate(stops: RoutePoint[]): Promise<RouteEstimate> {
    if (stops.length < 2) throw new Error("ROUTE_REQUIRES_TWO_STOPS");
    const [origin, ...remaining] = stops;
    const destination = remaining.at(-1)!;
    const intermediates = remaining.slice(0, -1).map(waypoint);
    const response = await this.fetcher(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        signal: AbortSignal.timeout(7_500),
        headers: {
          "content-type": "application/json",
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify({
          origin: waypoint(origin),
          destination: waypoint(destination),
          intermediates,
          travelMode: "DRIVE",
          computeAlternativeRoutes: false,
          languageCode: "en-US",
          units: "IMPERIAL",
        }),
      },
    );
    if (!response.ok)
      throw new Error(`ROUTING_PROVIDER_ERROR:${response.status}`);
    const route = googleRouteResponse.parse(await response.json()).routes[0];
    if (!route) throw new Error("ROUTE_NOT_FOUND");
    return {
      provider: this.name,
      providerVersion: "google-routes-v2",
      routeType: "GENERAL_ROAD_ESTIMATE",
      distanceMeters: route.distanceMeters,
      durationSeconds: Math.round(Number.parseFloat(route.duration)),
      encodedPolyline: route.polyline?.encodedPolyline,
      calculatedAt: new Date(),
      warning: GENERAL_ROAD_WARNING,
    };
  }
}

function waypoint(point: RoutePoint) {
  return { location: { latLng: point } };
}

function haversine(a: RoutePoint, b: RoutePoint) {
  const rad = (value: number) => (value * Math.PI) / 180;
  const earth = 6_371_000;
  const latitude = rad(b.latitude - a.latitude);
  const longitude = rad(b.longitude - a.longitude);
  const value =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(longitude / 2) ** 2;
  return 2 * earth * Math.asin(Math.sqrt(value));
}

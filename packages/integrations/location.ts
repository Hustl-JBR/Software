import { z } from "zod";

export type PlaceSuggestion = {
  provider: string;
  placeId: string;
  label: string;
};

export type ResolvedLocation = {
  provider: string;
  placeId: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  validationStatus: "VALIDATED" | "NEEDS_REVIEW";
};

export interface LocationProvider {
  readonly name: string;
  readonly available: boolean;
  autocomplete(input: string, sessionToken: string): Promise<PlaceSuggestion[]>;
  resolve(placeId: string, sessionToken: string): Promise<ResolvedLocation>;
}

export class ProviderUnavailableLocationProvider implements LocationProvider {
  readonly name = "disabled";
  readonly available = false;
  async autocomplete(): Promise<PlaceSuggestion[]> {
    return [];
  }
  async resolve(): Promise<ResolvedLocation> {
    throw new Error("LOCATION_PROVIDER_UNAVAILABLE");
  }
}

export class DeterministicMockLocationProvider implements LocationProvider {
  readonly name = "deterministic-mock";
  readonly available = true;
  constructor(private readonly locations: ResolvedLocation[]) {}
  async autocomplete(input: string): Promise<PlaceSuggestion[]> {
    const query = input.toLowerCase();
    return this.locations
      .filter((location) =>
        `${location.name} ${location.formattedAddress}`
          .toLowerCase()
          .includes(query),
      )
      .map((location) => ({
        provider: this.name,
        placeId: location.placeId,
        label: `${location.name} — ${location.formattedAddress}`,
      }));
  }
  async resolve(placeId: string): Promise<ResolvedLocation> {
    const location = this.locations.find((item) => item.placeId === placeId);
    if (!location) throw new Error("PLACE_NOT_FOUND");
    return { ...location, provider: this.name };
  }
}

const autocompleteResponse = z.object({
  suggestions: z
    .array(
      z.object({
        placePrediction: z
          .object({
            placeId: z.string(),
            text: z.object({ text: z.string() }),
          })
          .optional(),
      }),
    )
    .default([]),
});

const placeResponse = z.object({
  id: z.string(),
  displayName: z.object({ text: z.string() }).optional(),
  formattedAddress: z.string(),
  location: z.object({ latitude: z.number(), longitude: z.number() }),
  timeZone: z.object({ id: z.string() }),
  addressComponents: z.array(
    z.object({
      longText: z.string(),
      shortText: z.string(),
      types: z.array(z.string()),
    }),
  ),
});

export class GoogleLocationProvider implements LocationProvider {
  readonly name = "google";
  readonly available = true;
  constructor(
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    if (!apiKey) throw new Error("GOOGLE_MAPS_SERVER_API_KEY_REQUIRED");
  }

  async autocomplete(input: string, sessionToken: string) {
    if (input.trim().length < 3) return [];
    const response = await this.request(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask":
            "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
        },
        body: JSON.stringify({
          input: input.trim(),
          sessionToken,
          includedRegionCodes: ["us"],
        }),
      },
    );
    return autocompleteResponse
      .parse(await response.json())
      .suggestions.flatMap(({ placePrediction }) =>
        placePrediction
          ? [
              {
                provider: this.name,
                placeId: placePrediction.placeId,
                label: placePrediction.text.text,
              },
            ]
          : [],
      );
  }

  async resolve(placeId: string, sessionToken: string) {
    if (!/^[A-Za-z0-9_-]{5,300}$/.test(placeId))
      throw new Error("INVALID_PLACE_ID");
    const response = await this.request(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`,
      {
        headers: {
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask":
            "id,displayName,formattedAddress,location,timeZone,addressComponents",
        },
      },
    );
    const place = placeResponse.parse(await response.json());
    const component = (type: string, short = false) => {
      const item = place.addressComponents.find((entry) =>
        entry.types.includes(type),
      );
      return item ? (short ? item.shortText : item.longText) : "";
    };
    const street = [component("street_number"), component("route")]
      .filter(Boolean)
      .join(" ");
    const city =
      component("locality") ||
      component("postal_town") ||
      component("administrative_area_level_2");
    const state = component("administrative_area_level_1", true);
    const postalCode = component("postal_code");
    return {
      provider: this.name,
      placeId: place.id,
      name: place.displayName?.text ?? street,
      addressLine1: street,
      city,
      state,
      postalCode,
      countryCode: component("country", true) || "US",
      formattedAddress: place.formattedAddress,
      latitude: place.location.latitude,
      longitude: place.location.longitude,
      timeZone: place.timeZone.id,
      validationStatus:
        street && city && state && postalCode ? "VALIDATED" : "NEEDS_REVIEW",
    } satisfies ResolvedLocation;
  }

  private async request(url: string, init: RequestInit) {
    const response = await this.fetcher(url, {
      ...init,
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok)
      throw new Error(`LOCATION_PROVIDER_ERROR:${response.status}`);
    return response;
  }
}

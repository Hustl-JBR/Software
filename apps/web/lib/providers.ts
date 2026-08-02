import {
  GoogleLocationProvider,
  ProviderUnavailableLocationProvider,
  type LocationProvider,
} from "@atlas/integrations/location";
import {
  GoogleRoutingProvider,
  ProviderUnavailableRoutingProvider,
  type RoutingProvider,
} from "@atlas/integrations/routing";

export function locationProvider(): LocationProvider {
  if (
    process.env.ATLAS_LOCATION_PROVIDER === "google" &&
    process.env.GOOGLE_MAPS_SERVER_API_KEY
  )
    return new GoogleLocationProvider(process.env.GOOGLE_MAPS_SERVER_API_KEY);
  return new ProviderUnavailableLocationProvider();
}

export function routingProvider(): RoutingProvider {
  if (
    process.env.ATLAS_ROUTE_PROVIDER === "google" &&
    process.env.GOOGLE_MAPS_SERVER_API_KEY
  )
    return new GoogleRoutingProvider(process.env.GOOGLE_MAPS_SERVER_API_KEY);
  return new ProviderUnavailableRoutingProvider();
}

export function providerCapabilities() {
  const location = locationProvider();
  const routing = routingProvider();
  return {
    location: { provider: location.name, available: location.available },
    routing: { provider: routing.name, available: routing.available },
    browserMapAvailable: Boolean(
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY &&
        process.env.ATLAS_ROUTE_PROVIDER === "google",
    ),
  };
}

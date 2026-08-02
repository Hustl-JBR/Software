# Routing provider

`RoutingProvider` accepts ordered coordinates and returns a provider-neutral immutable estimate: provider/version, type, distance in meters, duration in seconds, optional encoded polyline, calculation time, and warning.

Google Routes API v2 is the first live adapter. It requests `DRIVE` routing and only `routes.duration`, `routes.distanceMeters`, and `routes.polyline.encodedPolyline`. Calls use the server key, a 7.5-second timeout, validated response schemas, usage logging, and a coordinate/provider request hash for cache reuse.

Every current implementation returns `GENERAL_ROAD_ESTIMATE` and the exact warning: “General road estimate only — not truck-legal or commercial vehicle routing.” Equipment is preserved as context but explicitly marked as not applied to the route. A new result marks the previous current snapshot stale; it does not rewrite it.

The adapter is enabled only when `ATLAS_ROUTE_PROVIDER=google` and the server key exists. Otherwise calculation is disabled without affecting facilities, stops, or manual shipment work.

# Location provider

Atlas uses the typed `LocationProvider` contract for autocomplete and place resolution. Implementations are Google, deterministic test mock, and unavailable/manual fallback.

The Google adapter calls Places API (New) only from the server, passes the restricted server key in `X-Goog-Api-Key`, applies narrow field masks, uses a UUID session token, limits results to the United States, validates response shapes with Zod, and uses a five-second timeout. The browser calls authenticated Atlas API routes; it never receives the server key.

Autocomplete waits for three characters and debounces for 400 ms. Requests are tenant-authorized and limited to 30 provider operations per user/organization per minute. Selection resolves name, formatted/components address, coordinates, and IANA time zone. Failed or disabled search leaves the manual form usable and makes no provider claim.

The adapter is enabled only when `ATLAS_LOCATION_PROVIDER=google` and `GOOGLE_MAPS_SERVER_API_KEY` are both present. No credential means the unavailable adapter. Deterministic mocks never run in staging as a supposed live provider.

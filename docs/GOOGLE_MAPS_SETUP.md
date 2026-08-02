# Google Maps setup

Use one Google Cloud project with billing and enable Places API (New), Routes API, and Maps JavaScript API. Create two separate keys:

1. Browser key: restrict by the exact staging web origins/referrers and restrict APIs to Maps JavaScript API. Store as `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`. This key is intentionally visible in the browser and relies on restrictions.
2. Server key: restrict to the Railway service's supported server restriction and restrict APIs to Places API (New) and Routes API. Store as `GOOGLE_MAPS_SERVER_API_KEY`. Never prefix it with `NEXT_PUBLIC_`.

Set `ATLAS_LOCATION_PROVIDER=google` and `ATLAS_ROUTE_PROVIDER=google` only after both the owner and credential scope are approved. Rotate exposed or unrestricted keys immediately. Never commit keys, paste them into tickets, screenshots, chat, seeds, tests, logs, or provider fixtures.

Atlas is deliberately usable without these variables: the address form switches to manual entry, route calculation is disabled, and the map shows an honest unavailable state. Credentials have not been added to Railway by this branch.

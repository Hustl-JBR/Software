# Maps cost controls

- Require three autocomplete characters and debounce by 400 ms.
- Use one UUID session token for autocomplete plus selected-place resolution; rotate after selection.
- Apply 30 provider operations per user/organization per minute.
- Use narrow Google field masks; never request `*`.
- Resolve details only after a selection.
- Reuse route snapshots by the hash of load, ordered coordinates, and provider.
- Persist metadata-only usage logs for tenant/provider/operation/outcome/duration.
- Use five-second Places and 7.5-second Routes timeouts.
- Do not retry interactively without an explicit policy; manual entry remains available.
- Configure Google Cloud budgets, quota alerts, per-API daily quotas, and key restrictions before activation.
- Review usage by operation and organization before raising quotas.

Atlas does not silently fall back to billable calls, preload maps on directory pages, calculate routes on every render, or treat an abandoned autocomplete session as complete.

"use client";

import { useEffect, useRef, useState } from "react";

type Suggestion = { placeId: string; label: string; provider: string };
type Location = {
  placeId: string;
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  timeZone: string;
};

export function FacilityLocationSearch({
  slug,
  enabled,
}: {
  slug: string;
  enabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [message, setMessage] = useState(
    enabled
      ? "Search begins after 3 characters. You can always enter the address manually."
      : "Provider search is not configured. Manual entry remains available.",
  );
  const token = useRef(crypto.randomUUID());
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/org/${encodeURIComponent(slug)}/locations/autocomplete`,
          {
            method: "POST",
            signal: controller.signal,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              input: query,
              sessionToken: token.current,
            }),
          },
        );
        if (!response.ok) throw new Error("SEARCH_UNAVAILABLE");
        const body = (await response.json()) as { suggestions: Suggestion[] };
        setSuggestions(body.suggestions);
        setMessage(
          body.suggestions.length
            ? "Select a result to validate and populate the address."
            : "No matches. Continue with manual entry.",
        );
      } catch (error) {
        if ((error as Error).name !== "AbortError")
          setMessage("Search is unavailable. Continue with manual entry.");
      }
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, query, slug]);

  async function select(suggestion: Suggestion) {
    const response = await fetch(
      `/api/org/${encodeURIComponent(slug)}/locations/resolve`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          placeId: suggestion.placeId,
          sessionToken: token.current,
        }),
      },
    );
    if (!response.ok) {
      setMessage("That result could not be validated. Continue manually.");
      return;
    }
    const { location } = (await response.json()) as { location: Location };
    const form = container.current?.closest("form");
    for (const [name, value] of Object.entries({
      name: location.name,
      addressLine1: location.addressLine1,
      city: location.city,
      state: location.state,
      postalCode: location.postalCode,
      countryCode: location.countryCode,
      timeZone: location.timeZone,
      externalPlaceId: location.placeId,
      providerSessionToken: token.current,
    })) {
      const field = form?.elements.namedItem(name);
      if (field instanceof HTMLInputElement) field.value = value;
    }
    setQuery(suggestion.label);
    setSuggestions([]);
    setMessage("Address selected and validated by the configured provider.");
  }

  return (
    <div className="facility-search" ref={container}>
      <label>
        Provider address search
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search facility or street address"
          disabled={!enabled}
          autoComplete="off"
        />
      </label>
      <input type="hidden" name="externalPlaceId" />
      <input type="hidden" name="providerSessionToken" />
      <p className="muted-copy" role="status">
        {message}
      </p>
      {suggestions.length > 0 && (
        <div className="facility-suggestions" role="listbox">
          {suggestions.map((suggestion) => (
            <button
              type="button"
              role="option"
              aria-selected="false"
              key={suggestion.placeId}
              onClick={() => select(suggestion)}
            >
              {suggestion.label}
            </button>
          ))}
          <small>Powered by Google</small>
        </div>
      )}
    </div>
  );
}

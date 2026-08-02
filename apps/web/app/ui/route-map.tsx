"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (
          element: HTMLElement,
          options: Record<string, unknown>,
        ) => unknown;
        Marker: new (options: Record<string, unknown>) => unknown;
        Polyline: new (options: Record<string, unknown>) => {
          setMap(map: unknown): void;
        };
        LatLngBounds: new () => { extend(point: Coordinate): void };
        geometry: { encoding: { decodePath(value: string): unknown[] } };
      };
    };
  }
}

type Coordinate = { lat: number; lng: number };

export function RouteMap({
  apiKey,
  stops,
  encodedPolyline,
}: {
  apiKey?: string;
  stops: Coordinate[];
  encodedPolyline?: string;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!apiKey || stops.length === 0 || !element.current) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !element.current || !window.google) return;
      const map = new window.google.maps.Map(element.current, {
        center: stops[0],
        zoom: stops.length > 1 ? 6 : 12,
        mapTypeControl: false,
        streetViewControl: false,
      });
      for (const [index, position] of stops.entries())
        new window.google.maps.Marker({
          map,
          position,
          label: String(index + 1),
        });
      if (encodedPolyline) {
        new window.google.maps.Polyline({
          path: window.google.maps.geometry.encoding.decodePath(
            encodedPolyline,
          ),
          strokeColor: "#3157d5",
          strokeOpacity: 0.9,
          strokeWeight: 5,
        }).setMap(map);
      }
    };
    if (window.google) render();
    else {
      const existing = document.querySelector<HTMLScriptElement>(
        "script[data-atlas-google-maps]",
      );
      const script = existing ?? document.createElement("script");
      if (!existing) {
        script.dataset.atlasGoogleMaps = "true";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=geometry`;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render, { once: true });
      script.addEventListener("error", () => setFailed(true), { once: true });
    }
    return () => {
      cancelled = true;
    };
  }, [apiKey, encodedPolyline, stops]);

  if (!apiKey)
    return (
      <div className="map-disabled" role="status">
        <b>Map unavailable</b>
        <span>Add the restricted browser key to enable the Google map.</span>
      </div>
    );
  if (stops.length === 0)
    return (
      <div className="map-disabled" role="status">
        <b>Coordinates required</b>
        <span>
          Validate or manually confirm stop coordinates before mapping.
        </span>
      </div>
    );
  if (failed)
    return <div className="map-disabled">The map provider could not load.</div>;
  return (
    <div className="route-map-canvas" ref={element} aria-label="Route map" />
  );
}

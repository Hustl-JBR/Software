"use client";

import { useRef } from "react";

export type ShipmentFacilityOption = {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  timeZone: string;
};

export function ShipmentFacilityPicker({
  prefix,
  facilities,
  defaultValue,
}: {
  prefix: "origin" | "destination";
  facilities: ShipmentFacilityOption[];
  defaultValue: string;
}) {
  const select = useRef<HTMLSelectElement>(null);
  function choose(id: string) {
    const facility = facilities.find((item) => item.id === id);
    if (!facility) return;
    const form = select.current?.closest("form");
    const values: Record<string, string> = {
      [`${prefix}FacilityName`]: facility.name,
      [`${prefix}AddressLine1`]: facility.addressLine1,
      [`${prefix}AddressLine2`]: facility.addressLine2 ?? "",
      [`${prefix}City`]: facility.city,
      [`${prefix}State`]: facility.state,
      [`${prefix}PostalCode`]: facility.postalCode,
      [`${prefix}TimeZone`]: facility.timeZone,
    };
    for (const [name, value] of Object.entries(values)) {
      const field = form?.elements.namedItem(name);
      if (field instanceof HTMLInputElement) field.value = value;
    }
  }
  return (
    <select
      ref={select}
      name={`${prefix}FacilityId`}
      defaultValue={defaultValue}
      onChange={(event) => choose(event.target.value)}
    >
      <option value="">Manual address</option>
      {facilities.map((facility) => (
        <option value={facility.id} key={facility.id}>
          {facility.name} — {facility.city}, {facility.state}
        </option>
      ))}
    </select>
  );
}

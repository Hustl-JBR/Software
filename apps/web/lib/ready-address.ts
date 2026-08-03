import { z } from "zod";

export type ReadyAddress = {
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
};

export type ReadyAddressKind = "pickup" | "delivery";
export type ReadyAddressField = "address line 1" | "city" | "state" | "ZIP";

export type CompleteReadyAddress = ReadyAddress & {
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
};

const usAddressSchema = z.object({
  addressLine1: z.string().trim().min(1),
  city: z.string().trim().min(1),
  state: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}(?:-\d{4})?$/),
});

export type ReadyAddressValidation = {
  kind: ReadyAddressKind;
  address: ReadyAddress;
  missing: ReadyAddressField[];
  invalid: ReadyAddressField[];
};

export function parseStoredReadyAddress(value: string): ReadyAddress {
  const parts = value.split(",").map((part) => part.trim());
  const addressLine1 = parts.shift() ?? "";
  const region = parts.length > 1 ? (parts.pop() ?? "") : "";
  const city = parts.join(", ");
  const regionMatch = region.match(
    /^([A-Za-z]{2})?(?:\s+)?(\d{5}(?:-\d{4})?)?$/,
  );

  return {
    addressLine1,
    city,
    state: regionMatch?.[1]?.toUpperCase() ?? "",
    postalCode: regionMatch?.[2] ?? "",
  };
}

export function formatStoredReadyAddress(address: ReadyAddress) {
  return `${address.addressLine1.trim()}, ${address.city.trim()}, ${address.state.trim().toUpperCase()} ${address.postalCode.trim()}`;
}

export function validateReadyAddress(
  kind: ReadyAddressKind,
  input: ReadyAddress,
): ReadyAddressValidation {
  const address = {
    addressLine1: input.addressLine1.trim(),
    city: input.city.trim(),
    state: input.state.trim().toUpperCase(),
    postalCode: input.postalCode.trim(),
  };
  const missing: ReadyAddressField[] = [];
  if (!address.addressLine1) missing.push("address line 1");
  if (!address.city) missing.push("city");
  if (!address.state) missing.push("state");
  if (!address.postalCode) missing.push("ZIP");

  const invalid: ReadyAddressField[] = [];
  if (address.state && !/^[A-Z]{2}$/.test(address.state)) invalid.push("state");
  if (address.postalCode && !/^\d{5}(?:-\d{4})?$/.test(address.postalCode))
    invalid.push("ZIP");

  return { kind, address, missing, invalid };
}

export function completeReadyAddress(
  validation: ReadyAddressValidation,
): CompleteReadyAddress | null {
  if (
    validation.missing.length ||
    validation.invalid.length ||
    !usAddressSchema.safeParse(validation.address).success
  )
    return null;
  return validation.address;
}

export function readyAddressIssues(validations: ReadyAddressValidation[]) {
  return validations.flatMap((validation) => [
    ...validation.missing.map(
      (field) => `${capitalize(validation.kind)} ${field} is missing.` as const,
    ),
    ...validation.invalid.map(
      (field) => `${capitalize(validation.kind)} ${field} is invalid.` as const,
    ),
  ]);
}

export function readyAddressError(validations: ReadyAddressValidation[]) {
  const incomplete = validations
    .map((validation) => {
      const fields = [...validation.missing, ...validation.invalid];
      return fields.length
        ? `${validation.kind} ${humanList([...new Set(fields)])}`
        : null;
    })
    .filter((value): value is string => Boolean(value));
  return incomplete.length
    ? `Complete the ${incomplete.join(" and the ")} before creating the load.`
    : null;
}

function humanList(values: string[]) {
  if (values.length < 2) return values[0] ?? "address";
  if (values.length === 2) return values.join(" and ");
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

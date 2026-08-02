import { z } from "zod";

const optionalText = z.string().trim().max(2_000).optional().or(z.literal(""));
const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} is required`).max(200);
const postalCode = z
  .string()
  .trim()
  .regex(/^\d{5}(?:-\d{4})?$/, "Enter a valid US postal code");
const stateCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Use a two-letter state code");
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value)
    );
  }, "Enter a valid calendar date");
const appointmentDateTime = z
  .string()
  .refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value) ||
      z.string().datetime({ offset: true }).safeParse(value).success,
    "Use a local date and time or an ISO 8601 instant",
  );

export const equipmentTypes = [
  "DRY_VAN",
  "REEFER",
  "FLATBED",
  "STEP_DECK",
  "CONESTOGA",
  "LOWBOY",
  "RGN",
  "POWER_ONLY",
  "BOX_TRUCK",
  "SPRINTER",
  "HOTSHOT",
  "TANKER",
] as const;
export type EquipmentType = (typeof equipmentTypes)[number];

const shipmentCandidateObject = z.object({
  customerName: requiredText("Customer or shipper name"),
  originFacilityName: requiredText("Origin facility name"),
  originFacilityId: z.string().uuid().optional().or(z.literal("")),
  originAddressLine1: optionalText,
  originAddressLine2: optionalText,
  originCity: requiredText("Origin city"),
  originState: stateCode,
  originPostalCode: postalCode,
  originTimeZone: optionalText,
  destinationFacilityName: requiredText("Destination facility name"),
  destinationFacilityId: z.string().uuid().optional().or(z.literal("")),
  destinationAddressLine1: optionalText,
  destinationAddressLine2: optionalText,
  destinationCity: requiredText("Destination city"),
  destinationState: stateCode,
  destinationPostalCode: postalCode,
  destinationTimeZone: optionalText,
  pickupDate: isoDate,
  deliveryDate: isoDate,
  commodity: requiredText("Commodity"),
  weightPounds: z.coerce.number().int().positive().max(80_000),
  equipmentType: z.enum(equipmentTypes),
  equipmentDetail: optionalText,
  pickupAppointmentStart: z
    .string()
    .pipe(appointmentDateTime)
    .optional()
    .or(z.literal("")),
  pickupAppointmentEnd: z
    .string()
    .pipe(appointmentDateTime)
    .optional()
    .or(z.literal("")),
  pickupAppointmentDisambiguation: z
    .enum(["EARLIER", "LATER", "REJECT"])
    .optional()
    .or(z.literal("")),
  deliveryAppointmentStart: z
    .string()
    .pipe(appointmentDateTime)
    .optional()
    .or(z.literal("")),
  deliveryAppointmentEnd: z
    .string()
    .pipe(appointmentDateTime)
    .optional()
    .or(z.literal("")),
  deliveryAppointmentDisambiguation: z
    .enum(["EARLIER", "LATER", "REJECT"])
    .optional()
    .or(z.literal("")),
  palletCount: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .or(z.literal("")),
  dimensions: optionalText,
  temperatureRequirements: optionalText,
  hazmat: z.coerce.boolean().default(false),
  declaredValueCents: z.coerce
    .number()
    .int()
    .nonnegative()
    .max(Number.MAX_SAFE_INTEGER)
    .optional()
    .or(z.literal("")),
  customerReferences: optionalText,
  specialInstructions: optionalText,
  internalNotes: optionalText,
});

export const shipmentCandidateSchema = shipmentCandidateObject.superRefine(
  (value, context) => {
    if (value.deliveryDate < value.pickupDate) {
      context.addIssue({
        code: "custom",
        path: ["deliveryDate"],
        message: "Delivery date cannot precede pickup date",
      });
    }
    for (const [startKey, endKey, label] of [
      ["pickupAppointmentStart", "pickupAppointmentEnd", "Pickup"],
      ["deliveryAppointmentStart", "deliveryAppointmentEnd", "Delivery"],
    ] as const) {
      const start = value[startKey];
      const end = value[endKey];
      if ((start && !end) || (!start && end)) {
        context.addIssue({
          code: "custom",
          path: [end ? startKey : endKey],
          message: `${label} appointment requires both start and end`,
        });
      } else if (
        start &&
        end &&
        /(?:Z|[+-]\d{2}:\d{2})$/.test(start) &&
        /(?:Z|[+-]\d{2}:\d{2})$/.test(end) &&
        new Date(end) <= new Date(start)
      ) {
        context.addIssue({
          code: "custom",
          path: [endKey],
          message: `${label} appointment end must be after start`,
        });
      }
    }
    for (const [prefix, startKey, endKey] of [
      ["origin", "pickupAppointmentStart", "pickupAppointmentEnd"],
      ["destination", "deliveryAppointmentStart", "deliveryAppointmentEnd"],
    ] as const) {
      const start = value[startKey];
      const end = value[endKey];
      const usesLocal = [start, end].some(
        (item) => item && !/(?:Z|[+-]\d{2}:\d{2})$/.test(item),
      );
      const zone = value[`${prefix}TimeZone`];
      if (usesLocal && !zone) {
        context.addIssue({
          code: "custom",
          path: [`${prefix}TimeZone`],
          message: `${prefix === "origin" ? "Pickup" : "Delivery"} time zone is required for local appointment times`,
        });
      }
    }
  },
);

export const candidateInputSchema = shipmentCandidateObject
  .partial()
  .extend({ equipmentType: z.string().optional() });
export type ShipmentCandidate = z.infer<typeof shipmentCandidateSchema>;

export type ShipmentIssue = {
  type: "MISSING" | "CONFLICTING" | "UNCERTAIN" | "INVALID" | "UNSUPPORTED";
  field: string;
  message: string;
  sourceReference?: string;
};

export function validateCandidate(
  candidate: unknown,
):
  | { success: true; data: ShipmentCandidate }
  | { success: false; issues: ShipmentIssue[] } {
  const result = shipmentCandidateSchema.safeParse(candidate);
  if (result.success) return result;
  return {
    success: false,
    issues: result.error.issues.map((issue) => ({
      type:
        issue.path[0] === "equipmentType" &&
        (issue.code === "invalid_enum_value" || issue.code === "invalid_type")
          ? "UNSUPPORTED"
          : issue.code === "invalid_type" || issue.code === "too_small"
            ? "MISSING"
            : "INVALID",
      field: issue.path.join("."),
      message: issue.message,
    })),
  };
}

export const shipmentRequestCommandSchema = z.object({
  organizationSlug: z.string().min(1),
  originalText: z.string().trim().max(10_000).default(""),
  structured: candidateInputSchema,
});

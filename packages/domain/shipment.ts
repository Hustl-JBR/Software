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
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

const shipmentCandidateObject = z.object({
  customerName: requiredText("Customer or shipper name"),
  originFacilityName: requiredText("Origin facility name"),
  originCity: requiredText("Origin city"),
  originState: stateCode,
  originPostalCode: postalCode,
  destinationFacilityName: requiredText("Destination facility name"),
  destinationCity: requiredText("Destination city"),
  destinationState: stateCode,
  destinationPostalCode: postalCode,
  pickupDate: isoDate,
  deliveryDate: isoDate,
  commodity: requiredText("Commodity"),
  weightPounds: z.coerce.number().int().positive().max(80_000),
  equipmentType: z.literal("DRY_VAN"),
  pickupAppointmentStart: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(z.literal("")),
  pickupAppointmentEnd: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(z.literal("")),
  deliveryAppointmentStart: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(z.literal("")),
  deliveryAppointmentEnd: z
    .string()
    .datetime({ offset: true })
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
      } else if (start && end && new Date(end) <= new Date(start)) {
        context.addIssue({
          code: "custom",
          path: [endKey],
          message: `${label} appointment end must be after start`,
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
        issue.code === "invalid_literal" && issue.path[0] === "equipmentType"
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

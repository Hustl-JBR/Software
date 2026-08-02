import type { ShipmentIssue } from "../domain/shipment";
import { candidateInputSchema, validateCandidate } from "../domain/shipment";

export type ExtractionResult = {
  schemaVersion: "1";
  provider: "deterministic-mock";
  providerVersion: "1";
  candidates: Record<string, unknown>;
  issues: ShipmentIssue[];
  sourceReferences: Record<string, string>;
};

export interface ShipmentExtractionAdapter {
  extract(input: {
    originalText: string;
    structured: Record<string, unknown>;
  }): Promise<ExtractionResult>;
}

const patterns: Record<string, RegExp> = {
  customerName: /(?:customer|shipper):\s*([^;\n]+)/i,
  commodity: /commodity:\s*([^;\n]+)/i,
  weightPounds: /weight:\s*([\d,]+)\s*(?:lb|lbs|pounds)/i,
  pickupDate: /pickup(?: date)?:\s*(\d{4}-\d{2}-\d{2})/i,
  deliveryDate: /delivery(?: date)?:\s*(\d{4}-\d{2}-\d{2})/i,
};

export class DeterministicMockExtractionAdapter
  implements ShipmentExtractionAdapter
{
  async extract(input: {
    originalText: string;
    structured: Record<string, unknown>;
  }): Promise<ExtractionResult> {
    const parsed = candidateInputSchema.parse(input.structured);
    const candidates: Record<string, unknown> = {
      equipmentType: "DRY_VAN",
      ...withoutEmpty(parsed),
    };
    const sourceReferences: Record<string, string> = {};
    for (const [field, pattern] of Object.entries(patterns)) {
      const match = input.originalText.match(pattern);
      if (match?.[1] && candidates[field] === undefined) {
        candidates[field] =
          field === "weightPounds"
            ? Number(match[1].replaceAll(",", ""))
            : match[1].trim();
        sourceReferences[field] = `Matched labeled text: ${match[0]}`;
      }
    }
    const validation = validateCandidate(candidates);
    const issues = validation.success
      ? []
      : validation.issues.map((issue) => ({
          ...issue,
          sourceReference: sourceReferences[issue.field],
        }));
    if (/\b(?:about|approximately|maybe|unsure)\b/i.test(input.originalText)) {
      issues.push({
        type: "UNCERTAIN",
        field: "originalText",
        message:
          "The request contains uncertainty language; confirm the affected values.",
        sourceReference: "Plain-English request",
      });
    }
    const dates = [
      ...input.originalText.matchAll(
        /pickup(?: date)?:\s*(\d{4}-\d{2}-\d{2})/gi,
      ),
    ].map((match) => match[1]);
    if (new Set(dates).size > 1) {
      issues.push({
        type: "CONFLICTING",
        field: "pickupDate",
        message: "Multiple pickup dates were provided.",
        sourceReference: dates.join(", "),
      });
    }
    return {
      schemaVersion: "1",
      provider: "deterministic-mock",
      providerVersion: "1",
      candidates,
      issues,
      sourceReferences,
    };
  }
}

function withoutEmpty(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) => item !== "" && item !== undefined,
    ),
  );
}

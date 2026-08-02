import { randomUUID } from "node:crypto";
import {
  validateCandidate,
  type EquipmentType,
  type ShipmentCandidate,
  type ShipmentIssue,
} from "../../../packages/domain/shipment";

export const DEMO_ORGANIZATION = {
  id: "demo-atlas-north",
  slug: "atlas-north",
  name: "Atlas North",
} as const;

export const DEMO_USER = {
  id: "demo-approver",
  name: "Demo Approver",
  role: "APPROVER" as const,
};

export type DemoRevision = {
  id: string;
  revisionNumber: number;
  originalText: string;
  structuredData: Record<string, unknown>;
  issues: Array<ShipmentIssue & { id: string }>;
  createdAt: Date;
};

export type DemoRequest = {
  id: string;
  status: "NEEDS_REVIEW" | "APPROVED";
  currentRevisionNumber: number;
  revisions: DemoRevision[];
  loadId?: string;
  createdAt: Date;
};

export type DemoLoad = {
  id: string;
  requestId: string;
  loadNumber: string;
  status: "DRAFT";
  customer: { name: string };
  commodity: string;
  weightPounds: number;
  equipmentType: EquipmentType;
  pickupDate: Date;
  deliveryDate: Date;
  approvedRevision: { revisionNumber: number };
  stops: Array<{
    id: string;
    sequence: number;
    type: "PICKUP" | "DELIVERY";
    facilityName: string;
    city: string;
    state: string;
    postalCode: string;
  }>;
  audits: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    correlationId: string;
    createdAt: Date;
  }>;
};

type DemoState = {
  requests: DemoRequest[];
  loads: DemoLoad[];
};

const globalDemo = globalThis as typeof globalThis & {
  __atlasDemoState?: DemoState;
};

export function isDemoMode() {
  return process.env.ATLAS_DEMO_MODE === "true";
}

function demoState(): DemoState {
  globalDemo.__atlasDemoState ??= { requests: [], loads: [] };
  return globalDemo.__atlasDemoState;
}

export function getDemoRequests() {
  return [...demoState().requests].sort(
    (left, right) => right.createdAt.valueOf() - left.createdAt.valueOf(),
  );
}

export function getDemoRequest(id: string) {
  return demoState().requests.find((request) => request.id === id);
}

export function getDemoLoad(id: string) {
  return demoState().loads.find((load) => load.id === id);
}

export function resetDemoStateForTests() {
  globalDemo.__atlasDemoState = { requests: [], loads: [] };
}

export function createDemoShipment(input: {
  organizationSlug: string;
  originalText: string;
  structured: Record<string, unknown>;
}) {
  requireDemoOrganization(input.organizationSlug);
  const candidates = extractDemoCandidate(input.originalText, input.structured);
  const issues = issueList(candidates, input.originalText);
  const requestId = randomUUID();
  const revisionId = randomUUID();
  const request: DemoRequest = {
    id: requestId,
    status: "NEEDS_REVIEW",
    currentRevisionNumber: 1,
    createdAt: new Date(),
    revisions: [
      {
        id: revisionId,
        revisionNumber: 1,
        originalText: input.originalText,
        structuredData: candidates,
        issues,
        createdAt: new Date(),
      },
    ],
  };
  demoState().requests.unshift(request);
  return { requestId, revisionId };
}

export function correctDemoShipment(
  organizationSlug: string,
  requestId: string,
  candidate: Record<string, unknown>,
) {
  requireDemoOrganization(organizationSlug);
  const request = getDemoRequest(requestId);
  if (!request) throw new Error("NOT_FOUND");
  if (request.status === "APPROVED") throw new Error("ALREADY_APPROVED");
  const previous = request.revisions[0];
  const validation = validateCandidate(candidate);
  const revision: DemoRevision = {
    id: randomUUID(),
    revisionNumber: previous.revisionNumber + 1,
    originalText: previous.originalText,
    structuredData: candidate,
    issues: withIds(validation.success ? [] : validation.issues),
    createdAt: new Date(),
  };
  request.revisions.unshift(revision);
  request.currentRevisionNumber = revision.revisionNumber;
  return revision.id;
}

export function approveDemoRevision(
  organizationSlug: string,
  revisionId: string,
) {
  requireDemoOrganization(organizationSlug);
  const request = demoState().requests.find((item) =>
    item.revisions.some((revision) => revision.id === revisionId),
  );
  if (!request) throw new Error("NOT_FOUND");
  if (request.loadId) return request.loadId;
  const revision = request.revisions.find((item) => item.id === revisionId);
  if (!revision) throw new Error("NOT_FOUND");
  if (revision.revisionNumber !== request.currentRevisionNumber)
    throw new Error("STALE_REVISION");
  const validation = validateCandidate(revision.structuredData);
  if (!validation.success)
    throw new Error(
      `INVALID_REVISION:${validation.issues.map((issue) => issue.message).join("; ")}`,
    );

  const load = buildDemoLoad(request, revision, validation.data);
  demoState().loads.push(load);
  request.loadId = load.id;
  request.status = "APPROVED";
  return load.id;
}

function buildDemoLoad(
  request: DemoRequest,
  revision: DemoRevision,
  data: ShipmentCandidate,
): DemoLoad {
  const id = randomUUID();
  const correlationId = randomUUID();
  const now = Date.now();
  const event = (action: string, entityType: string, offset: number) => ({
    id: randomUUID(),
    action,
    entityType,
    entityId: entityType === "Load" ? id : request.id,
    correlationId,
    createdAt: new Date(now + offset),
  });
  return {
    id,
    requestId: request.id,
    loadNumber: `DEMO-${request.id.slice(0, 8).toUpperCase()}`,
    status: "DRAFT",
    customer: { name: data.customerName },
    commodity: data.commodity,
    weightPounds: data.weightPounds,
    equipmentType: data.equipmentType,
    pickupDate: new Date(`${data.pickupDate}T00:00:00.000Z`),
    deliveryDate: new Date(`${data.deliveryDate}T00:00:00.000Z`),
    approvedRevision: { revisionNumber: revision.revisionNumber },
    stops: [
      {
        id: randomUUID(),
        sequence: 1,
        type: "PICKUP",
        facilityName: data.originFacilityName,
        city: data.originCity,
        state: data.originState,
        postalCode: data.originPostalCode,
      },
      {
        id: randomUUID(),
        sequence: 2,
        type: "DELIVERY",
        facilityName: data.destinationFacilityName,
        city: data.destinationCity,
        state: data.destinationState,
        postalCode: data.destinationPostalCode,
      },
    ],
    audits: [
      event("SHIPMENT_REQUEST_CREATED", "ShipmentRequest", 0),
      event("MOCK_EXTRACTION_COMPLETED", "ShipmentRequestRevision", 1),
      event("REVISION_CORRECTED", "ShipmentRequestRevision", 2),
      event("APPROVAL_ACCEPTED", "ApprovalRequest", 3),
      event("DRAFT_LOAD_CREATED", "Load", 4),
      event("STOPS_CREATED", "Load", 5),
      event("LOAD_STATUS_INITIALIZED", "Load", 6),
    ],
  };
}

function extractDemoCandidate(
  originalText: string,
  structured: Record<string, unknown>,
) {
  const candidates: Record<string, unknown> = {
    customerName: "Atlas Demo Shipper",
    equipmentType: /dry van/i.test(originalText) ? "DRY_VAN" : undefined,
    ...withoutEmpty(structured),
  };
  const route = originalText.match(
    /from\s+([^,]+),\s*([A-Za-z ]+?)\s+to\s+([^,]+),\s*([A-Za-z ]+?)(?:\.|,|\s+Pickup)/i,
  );
  if (route) {
    candidates.originCity ??= route[1].trim();
    candidates.originState ??= stateCode(route[2]);
    candidates.destinationCity ??= route[3].trim();
    candidates.destinationState ??= stateCode(route[4]);
  }
  const pallets = originalText.match(/(\d+)\s+pallets?/i);
  if (pallets) candidates.palletCount ??= Number(pallets[1]);
  const commodity = originalText.match(/pallets?\s+of\s+(.+?)\s+from\s+/i);
  if (commodity) candidates.commodity ??= sentenceCase(commodity[1]);
  const weight = originalText.match(/weighs?\s+([\d,]+)\s+pounds?/i);
  if (weight) candidates.weightPounds ??= Number(weight[1].replaceAll(",", ""));
  candidates.pickupDate ??= naturalDate(originalText, "Pickup");
  candidates.deliveryDate ??= naturalDate(originalText, "delivery");
  return withoutEmpty(candidates);
}

function issueList(candidates: Record<string, unknown>, originalText: string) {
  const validation = validateCandidate(candidates);
  const issues = validation.success ? [] : validation.issues;
  if (/\b(?:about|approximately|maybe|unsure)\b/i.test(originalText)) {
    issues.push({
      type: "UNCERTAIN",
      field: "originalText",
      message:
        "The request contains uncertainty language; confirm the affected values.",
      sourceReference: "Plain-English request",
    });
  }
  return withIds(issues);
}

function withIds(issues: ShipmentIssue[]) {
  return issues.map((issue) => ({ ...issue, id: randomUUID() }));
}

function naturalDate(text: string, label: string) {
  const match = text.match(
    new RegExp(`${label} is ([A-Za-z]+ \\d{1,2}, \\d{4})`, "i"),
  );
  if (!match) return undefined;
  const date = new Date(`${match[1]} 00:00:00 UTC`);
  return Number.isNaN(date.valueOf())
    ? undefined
    : date.toISOString().slice(0, 10);
}

function stateCode(value: string) {
  const states: Record<string, string> = {
    tennessee: "TN",
    georgia: "GA",
  };
  const normalized = value.trim().toLowerCase();
  return states[normalized] ?? value.trim().toUpperCase().slice(0, 2);
}

function sentenceCase(value: string) {
  const trimmed = value.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function withoutEmpty(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) => item !== "" && item !== undefined,
    ),
  );
}

function requireDemoOrganization(slug: string) {
  if (slug !== DEMO_ORGANIZATION.slug) throw new Error("NOT_FOUND");
}

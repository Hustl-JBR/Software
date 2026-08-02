"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import {
  acceptQuote as acceptQuoteCommand,
  addCarrierCandidate,
  addTrackingUpdate,
  approveQuote as approveQuoteCommand,
  assignDriver,
  completeTask as completeTaskCommand,
  confirmAppointment,
  createQuote as createQuoteCommand,
  createTask as createTaskCommand,
  logCommunication,
  recordCustomerCall,
  selectCarrier as selectCarrierCommand,
  setLoadOwnership,
} from "@atlas/db/operations";
import { getSessionUserId } from "@/lib/session";
import { parseUsdToCents } from "@/lib/currency";
import { safeErrorCode, safeReturnPath } from "@/lib/safe-error";
import {
  archiveFacility as archiveFacilityCommand,
  attachFacilityToStop,
  calculateRouteSnapshot,
  createFacility as createFacilityCommand,
  updateFacility as updateFacilityCommand,
} from "@atlas/db/facilities";
import { locationProvider, routingProvider } from "@/lib/providers";

function value(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

async function run(
  form: FormData,
  task: (userId: string, slug: string) => Promise<unknown>,
) {
  const slug = value(form, "organizationSlug");
  const returnPath = safeReturnPath(slug, value(form, "returnPath"));
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");
  try {
    await task(userId, slug);
    redirect(`${returnPath}?saved=1`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    redirect(`${returnPath}?error=${safeErrorCode(error)}`);
  }
}

export async function recordCall(form: FormData) {
  return run(form, (userId, slug) =>
    recordCustomerCall(userId, slug, {
      customerName: value(form, "customerName"),
      contactName: value(form, "contactName") || undefined,
      notes: value(form, "notes"),
      occurredAt: value(form, "occurredAt"),
    }),
  );
}

export async function createQuote(form: FormData) {
  return run(form, (userId, slug) =>
    createQuoteCommand(userId, slug, {
      shipmentRequestId: value(form, "shipmentRequestId"),
      amountCents: parseUsdToCents(value(form, "amount")),
      assumptions: value(form, "assumptions") || undefined,
    }),
  );
}

export async function approveQuote(form: FormData) {
  return run(form, (userId, slug) =>
    approveQuoteCommand(
      userId,
      slug,
      value(form, "quoteId"),
      value(form, "idempotencyKey") || randomUUID(),
    ),
  );
}

export async function acceptQuote(form: FormData) {
  return run(form, (userId, slug) =>
    acceptQuoteCommand(
      userId,
      slug,
      { quoteId: value(form, "quoteId"), evidence: value(form, "evidence") },
      value(form, "idempotencyKey") || randomUUID(),
    ),
  );
}

export async function addCandidate(form: FormData) {
  return run(form, (userId, slug) =>
    addCarrierCandidate(userId, slug, {
      loadId: value(form, "loadId"),
      carrierName: value(form, "carrierName"),
      authorityConfirmed: form.get("authorityConfirmed") === "on",
      insuranceConfirmed: form.get("insuranceConfirmed") === "on",
      cargoCoverageCents: value(form, "cargoCoverage")
        ? parseUsdToCents(value(form, "cargoCoverage"))
        : undefined,
      quotedCostCents: value(form, "quotedCost")
        ? parseUsdToCents(value(form, "quotedCost"))
        : undefined,
    }),
  );
}

export async function selectCarrier(form: FormData) {
  return run(form, (userId, slug) =>
    selectCarrierCommand(
      userId,
      slug,
      value(form, "candidateId"),
      value(form, "idempotencyKey") || randomUUID(),
    ),
  );
}

export async function recordDriver(form: FormData) {
  return run(form, (userId, slug) =>
    assignDriver(userId, slug, {
      loadId: value(form, "loadId"),
      carrierCandidateId: value(form, "carrierCandidateId"),
      driverName: value(form, "driverName"),
      driverPhone: value(form, "driverPhone") || undefined,
      dispatcherName: value(form, "dispatcherName"),
      dispatcherPhone: value(form, "dispatcherPhone") || undefined,
      tractorNumber: value(form, "tractorNumber") || undefined,
      trailerNumber: value(form, "trailerNumber") || undefined,
    }),
  );
}

export async function confirmStop(form: FormData) {
  return run(form, (userId, slug) =>
    confirmAppointment(userId, slug, value(form, "stopId")),
  );
}

export async function updateOwnership(form: FormData) {
  return run(form, (userId, slug) =>
    setLoadOwnership(userId, slug, {
      loadId: value(form, "loadId"),
      primaryOwnerId: value(form, "primaryOwnerId"),
      nextAction: value(form, "nextAction"),
    }),
  );
}

export async function addTracking(form: FormData) {
  return run(form, (userId, slug) =>
    addTrackingUpdate(userId, slug, {
      loadId: value(form, "loadId"),
      status: value(form, "status"),
      location: value(form, "location") || undefined,
      notes: value(form, "notes") || undefined,
      occurredAt: value(form, "occurredAt"),
    }),
  );
}

export async function addCommunication(form: FormData) {
  return run(form, (userId, slug) =>
    logCommunication(userId, slug, {
      loadId: value(form, "loadId"),
      channel: value(form, "channel"),
      partyType: value(form, "partyType"),
      partyName: value(form, "partyName"),
      direction: value(form, "direction"),
      summary: value(form, "summary"),
      occurredAt: value(form, "occurredAt"),
    }),
  );
}

export async function createTask(form: FormData) {
  return run(form, (userId, slug) =>
    createTaskCommand(userId, slug, {
      loadId: value(form, "loadId") || undefined,
      title: value(form, "title"),
      assigneeId: value(form, "assigneeId"),
      dueAt: value(form, "dueAt") || undefined,
    }),
  );
}

export async function completeTask(form: FormData) {
  return run(form, (userId, slug) =>
    completeTaskCommand(userId, slug, value(form, "taskId")),
  );
}

export async function createFacility(form: FormData) {
  return run(form, (userId, slug) =>
    createFacilityCommand(
      userId,
      slug,
      {
        name: value(form, "name"),
        addressLine1: value(form, "addressLine1"),
        addressLine2: value(form, "addressLine2") || undefined,
        city: value(form, "city"),
        state: value(form, "state"),
        postalCode: value(form, "postalCode"),
        countryCode: value(form, "countryCode") || "US",
        timeZone: value(form, "timeZone"),
        latitude: value(form, "latitude")
          ? Number(value(form, "latitude"))
          : undefined,
        longitude: value(form, "longitude")
          ? Number(value(form, "longitude"))
          : undefined,
        phone: value(form, "phone") || undefined,
        shippingHours: value(form, "shippingHours") || undefined,
        receivingHours: value(form, "receivingHours") || undefined,
        appointmentRequired: form.get("appointmentRequired") === "on",
        appointmentInstructions:
          value(form, "appointmentInstructions") || undefined,
        internalNotes: value(form, "internalNotes") || undefined,
        externalPlaceId: value(form, "externalPlaceId") || undefined,
        providerSessionToken: value(form, "providerSessionToken") || undefined,
      },
      locationProvider(),
    ),
  );
}

export async function archiveFacility(form: FormData) {
  return run(form, (userId, slug) =>
    archiveFacilityCommand(userId, slug, value(form, "facilityId")),
  );
}

export async function updateFacility(form: FormData) {
  return run(form, (userId, slug) =>
    updateFacilityCommand(userId, slug, value(form, "facilityId"), {
      name: value(form, "name"),
      addressLine1: value(form, "addressLine1"),
      addressLine2: value(form, "addressLine2") || undefined,
      city: value(form, "city"),
      state: value(form, "state"),
      postalCode: value(form, "postalCode"),
      countryCode: value(form, "countryCode") || "US",
      timeZone: value(form, "timeZone"),
      latitude: value(form, "latitude")
        ? Number(value(form, "latitude"))
        : undefined,
      longitude: value(form, "longitude")
        ? Number(value(form, "longitude"))
        : undefined,
      phone: value(form, "phone") || undefined,
      shippingHours: value(form, "shippingHours") || undefined,
      receivingHours: value(form, "receivingHours") || undefined,
      appointmentRequired: form.get("appointmentRequired") === "on",
      appointmentInstructions:
        value(form, "appointmentInstructions") || undefined,
      internalNotes: value(form, "internalNotes") || undefined,
    }),
  );
}

export async function attachStopFacility(form: FormData) {
  return run(form, (userId, slug) =>
    attachFacilityToStop(
      userId,
      slug,
      value(form, "stopId"),
      value(form, "facilityId"),
    ),
  );
}

export async function calculateRoute(form: FormData) {
  return run(form, (userId, slug) =>
    calculateRouteSnapshot(
      userId,
      slug,
      value(form, "loadId"),
      value(form, "idempotencyKey") || randomUUID(),
      routingProvider(),
    ),
  );
}

function isRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}

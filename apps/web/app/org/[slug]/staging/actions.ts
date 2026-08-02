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

function value(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

async function run(
  form: FormData,
  task: (userId: string, slug: string) => Promise<unknown>,
) {
  const slug = value(form, "organizationSlug");
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");
  try {
    await task(userId, slug);
    redirect(`/org/${slug}/staging?saved=1`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    const code = error instanceof Error ? error.message : "UNKNOWN";
    redirect(`/org/${slug}/staging?error=${encodeURIComponent(code)}`);
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
      amountCents: value(form, "amountCents"),
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
      cargoCoverageCents: value(form, "cargoCoverageCents") || undefined,
      quotedCostCents: value(form, "quotedCostCents") || undefined,
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

function isRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}

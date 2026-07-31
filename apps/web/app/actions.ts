"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@atlas/db/client";
import {
  approveRevision,
  correctShipmentRequest,
  createShipmentRequest,
} from "@atlas/db/commands";
import { createSession, clearSession, getSessionUserId } from "@/lib/session";

function value(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}
function candidate(form: FormData) {
  const result: Record<string, unknown> = {};
  const fields = [
    "customerName",
    "originFacilityName",
    "originCity",
    "originState",
    "originPostalCode",
    "destinationFacilityName",
    "destinationCity",
    "destinationState",
    "destinationPostalCode",
    "pickupDate",
    "deliveryDate",
    "commodity",
    "weightPounds",
    "equipmentType",
    "pickupAppointmentStart",
    "pickupAppointmentEnd",
    "deliveryAppointmentStart",
    "deliveryAppointmentEnd",
    "palletCount",
    "dimensions",
    "temperatureRequirements",
    "declaredValueCents",
    "customerReferences",
    "specialInstructions",
    "internalNotes",
  ];
  for (const field of fields) {
    const item = value(form, field);
    if (item !== "")
      result[field] =
        field.endsWith("AppointmentStart") || field.endsWith("AppointmentEnd")
          ? `${item}:00.000Z`
          : item;
  }
  result.hazmat = form.get("hazmat") === "on";
  return result;
}
async function user() {
  const id = await getSessionUserId();
  if (!id) redirect("/sign-in");
  return id;
}

export async function signIn(form: FormData) {
  const email = value(form, "email");
  const found = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: { organization: true },
        take: 1,
      },
    },
  });
  if (!found || !found.memberships[0]) redirect("/sign-in?error=unknown-user");
  await createSession(found.id);
  redirect(`/org/${found.memberships[0].organization.slug}`);
}
export async function signOut() {
  await clearSession();
  redirect("/sign-in");
}
export async function submitShipment(form: FormData) {
  const organizationSlug = value(form, "organizationSlug");
  const result = await createShipmentRequest(await user(), {
    organizationSlug,
    originalText: value(form, "originalText"),
    structured: candidate(form),
  });
  redirect(`/org/${organizationSlug}/requests/${result.requestId}`);
}
export async function saveCorrection(form: FormData) {
  const organizationSlug = value(form, "organizationSlug");
  const requestId = value(form, "requestId");
  await correctShipmentRequest(
    await user(),
    organizationSlug,
    requestId,
    candidate(form),
  );
  redirect(`/org/${organizationSlug}/requests/${requestId}?saved=1`);
}
export async function approve(form: FormData) {
  const organizationSlug = value(form, "organizationSlug");
  try {
    const loadId = await approveRevision(
      await user(),
      organizationSlug,
      value(form, "revisionId"),
      value(form, "idempotencyKey") || randomUUID(),
    );
    redirect(`/org/${organizationSlug}/loads/${loadId}`);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN")
      redirect(`/org/${organizationSlug}?error=forbidden`);
    throw error;
  }
}

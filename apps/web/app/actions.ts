"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ZodError } from "zod";
import { prisma } from "@atlas/db/client";
import {
  approveRevision,
  correctShipmentRequest,
  createShipmentRequest,
} from "@atlas/db/commands";
import { getSessionUserId } from "@/lib/session";
import { auth } from "@/lib/auth";
import {
  approveDemoRevision,
  correctDemoShipment,
  createDemoShipment,
  DEMO_ORGANIZATION,
  DEMO_USER,
  isDemoMode,
} from "@/lib/demo-store";

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
  if (isDemoMode()) return DEMO_USER.id;
  const id = await getSessionUserId();
  if (!id) redirect("/sign-in");
  return id;
}

export async function signIn(form: FormData) {
  if (isDemoMode()) redirect(`/org/${DEMO_ORGANIZATION.slug}`);
  const email = value(form, "email");
  const password = value(form, "password");
  try {
    const result = await auth.api.signInEmail({
      body: { email, password, rememberMe: false },
      headers: await headers(),
    });
    const found = await prisma.user.findUnique({
      where: { id: result.user.id, active: true },
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: { organization: true },
          take: 1,
        },
      },
    });
    if (!found || !found.memberships[0])
      redirect("/sign-in?error=unknown-user");
    redirect(`/org/${found.memberships[0].organization.slug}`);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirect("/sign-in?error=database");
  }
}
export async function signOut() {
  if (isDemoMode()) redirect(`/org/${DEMO_ORGANIZATION.slug}`);
  await auth.api.signOut({ headers: await headers() });
  redirect("/sign-in");
}
export async function submitShipment(form: FormData) {
  const organizationSlug = value(form, "organizationSlug");
  try {
    const input = {
      organizationSlug,
      originalText: value(form, "originalText"),
      structured: candidate(form),
    };
    const result = isDemoMode()
      ? createDemoShipment(input)
      : await createShipmentRequest(await user(), input);
    redirect(`/org/${organizationSlug}/requests/${result.requestId}`);
  } catch (error) {
    redirectWithSafeError(`/org/${organizationSlug}/requests/new`, error);
  }
}
export async function saveCorrection(form: FormData) {
  const organizationSlug = value(form, "organizationSlug");
  const requestId = value(form, "requestId");
  try {
    if (isDemoMode()) {
      correctDemoShipment(organizationSlug, requestId, candidate(form));
    } else {
      await correctShipmentRequest(
        await user(),
        organizationSlug,
        requestId,
        candidate(form),
      );
    }
    redirect(`/org/${organizationSlug}/requests/${requestId}?saved=1`);
  } catch (error) {
    redirectWithSafeError(
      `/org/${organizationSlug}/requests/${requestId}`,
      error,
    );
  }
}
export async function approve(form: FormData) {
  const organizationSlug = value(form, "organizationSlug");
  const revisionId = value(form, "revisionId");
  const requestId = value(form, "requestId");
  try {
    const loadId = isDemoMode()
      ? approveDemoRevision(organizationSlug, revisionId)
      : await approveRevision(
          await user(),
          organizationSlug,
          revisionId,
          value(form, "idempotencyKey") || randomUUID(),
        );
    redirect(`/org/${organizationSlug}/loads/${loadId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    redirectWithSafeError(
      message === "REVISION_ALREADY_APPROVED" || message === "ALREADY_APPROVED"
        ? `/org/${organizationSlug}`
        : requestId
          ? `/org/${organizationSlug}/requests/${requestId}`
          : `/org/${organizationSlug}`,
      error,
    );
  }
}

function redirectWithSafeError(path: string, error: unknown): never {
  // Next.js redirects are represented internally as thrown errors. Preserve them.
  if (isNextRedirect(error)) throw error;
  const message = error instanceof Error ? error.message : "";
  const code =
    error instanceof ZodError
      ? "invalid-form"
      : message === "FORBIDDEN"
        ? "unauthorized"
        : message === "NOT_FOUND"
          ? "not-found"
          : message === "STALE_REVISION"
            ? "stale-revision"
            : message === "REVISION_ALREADY_APPROVED" ||
                message === "ALREADY_APPROVED"
              ? "duplicate-approval"
              : message === "IDEMPOTENCY_KEY_REUSED" ||
                  message === "INVALID_IDEMPOTENCY_KEY" ||
                  message === "APPROVAL_IN_PROGRESS"
                ? "idempotency"
                : message.startsWith("INVALID_REVISION")
                  ? "invalid-revision"
                  : message.includes("validation") || message.includes("parse")
                    ? "invalid-form"
                    : "database";
  return redirect(`${path}${path.includes("?") ? "&" : "?"}error=${code}`);
}

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}

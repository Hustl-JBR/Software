"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@atlas/db/client";
import { requireStagingWorkspace } from "@/lib/staging-workspace";
import { parseUsdToCents } from "@/lib/currency";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function date(value: string) {
  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf())) throw new Error("INVALID_DATE");
  return parsed;
}

async function actor(form: FormData) {
  const slug = text(form, "organizationSlug");
  const workspace = await requireStagingWorkspace(slug);
  if (
    !workspace.roles.includes("OPERATOR") &&
    !workspace.roles.includes("APPROVER")
  ) {
    throw new Error("FORBIDDEN");
  }
  return {
    slug,
    organizationId: workspace.membership.organizationId,
    userId: workspace.userId,
  };
}

function done(slug: string, path: string) {
  revalidatePath(`/org/${slug}`);
  revalidatePath(`/org/${slug}/${path}`);
  redirect(`/org/${slug}/${path}`);
}

export async function createCustomer(form: FormData) {
  const ctx = await actor(form);
  const customer = await prisma.customer.create({
    data: {
      organizationId: ctx.organizationId,
      name: text(form, "name"),
      contactName: text(form, "contactName") || null,
      contactEmail: text(form, "contactEmail") || null,
      contactPhone: text(form, "contactPhone") || null,
      billingAddress: text(form, "billingAddress") || null,
      paymentTerms: text(form, "paymentTerms") || "Net 30",
    },
  });
  await prisma.auditEvent.create({
    data: {
      organizationId: ctx.organizationId,
      actorType: "USER",
      actorId: ctx.userId,
      action: "CUSTOMER_CREATED",
      entityType: "Customer",
      entityId: customer.id,
      afterState: { name: customer.name },
      correlationId: randomUUID(),
    },
  });
  done(ctx.slug, "companies?type=customers");
}

export async function createReadyQuote(form: FormData) {
  const ctx = await actor(form);
  const customerId = text(form, "customerId");
  const customer = await prisma.customer.findFirstOrThrow({
    where: { id: customerId, organizationId: ctx.organizationId },
  });
  const pickupDate = date(text(form, "pickupDate"));
  const deliveryDate = date(text(form, "deliveryDate"));
  const quoteId = await prisma.$transaction(async (tx) => {
    const request = await tx.shipmentRequest.create({
      data: { organizationId: ctx.organizationId },
    });
    const revision = await tx.shipmentRequestRevision.create({
      data: {
        organizationId: ctx.organizationId,
        shipmentRequestId: request.id,
        revisionNumber: 1,
        originalText: `Manual quote request for ${customer.name}`,
        structuredData: {
          customerId,
          customerName: customer.name,
          pickupAddress: text(form, "pickupAddress"),
          deliveryAddress: text(form, "deliveryAddress"),
        },
        extractionMetadata: { source: "manual" },
        validationResults: { valid: true },
        createdById: ctx.userId,
      },
    });
    const count = await tx.quote.count({
      where: { organizationId: ctx.organizationId },
    });
    const quote = await tx.quote.create({
      data: {
        organizationId: ctx.organizationId,
        shipmentRequestId: request.id,
        createdById: ctx.userId,
        quoteNumber: `RFQ-${String(count + 1).padStart(5, "0")}`,
        contactName: text(form, "contactName") || customer.contactName,
        contactEmail: text(form, "contactEmail") || customer.contactEmail,
        pickupAddress: text(form, "pickupAddress"),
        deliveryAddress: text(form, "deliveryAddress"),
        pickupDate,
        deliveryDate,
        equipmentType: text(form, "equipmentType"),
        commodity: text(form, "commodity"),
        weightPounds: Number(text(form, "weightPounds")),
        palletCount: Number(text(form, "palletCount")) || null,
        specialInstructions: text(form, "specialInstructions") || null,
        amountCents: parseUsdToCents(text(form, "customerPrice")),
        estimatedCarrierCostCents: parseUsdToCents(
          text(form, "estimatedCarrierCost"),
        ),
      },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: ctx.organizationId,
        actorType: "USER",
        actorId: ctx.userId,
        action: "QUOTE_CREATED",
        entityType: "Quote",
        entityId: quote.id,
        afterState: { quoteNumber: quote.quoteNumber, revisionId: revision.id },
        correlationId: randomUUID(),
      },
    });
    return quote.id;
  });
  done(ctx.slug, `quotes/${quoteId}`);
}

export async function setQuoteStatus(form: FormData) {
  const ctx = await actor(form);
  const quoteId = text(form, "quoteId");
  const status = text(form, "status") as
    | "DRAFT"
    | "SENT"
    | "AWAITING_CUSTOMER"
    | "DECLINED"
    | "EXPIRED";
  await prisma.quote.updateMany({
    where: { id: quoteId, organizationId: ctx.organizationId },
    data: { status, sentAt: status === "SENT" ? new Date() : undefined },
  });
  done(ctx.slug, `quotes/${quoteId}`);
}

export async function acceptReadyQuote(form: FormData) {
  const ctx = await actor(form);
  const quote = await prisma.quote.findFirstOrThrow({
    where: { id: text(form, "quoteId"), organizationId: ctx.organizationId },
    include: {
      shipmentRequest: {
        include: {
          revisions: { orderBy: { revisionNumber: "desc" }, take: 1 },
        },
      },
    },
  });
  const data = quote.shipmentRequest.revisions[0]?.structuredData as {
    customerId?: string;
  };
  if (
    !data.customerId ||
    !quote.pickupDate ||
    !quote.deliveryDate ||
    !quote.pickupAddress ||
    !quote.deliveryAddress ||
    !quote.equipmentType ||
    !quote.commodity ||
    !quote.weightPounds
  )
    throw new Error("QUOTE_INCOMPLETE");
  const revision = quote.shipmentRequest.revisions[0];
  const ready = {
    customerId: data.customerId,
    pickupDate: quote.pickupDate,
    deliveryDate: quote.deliveryDate,
    pickupAddress: quote.pickupAddress,
    deliveryAddress: quote.deliveryAddress,
    equipmentType: quote.equipmentType,
    commodity: quote.commodity,
    weightPounds: quote.weightPounds,
  };
  const load = await prisma.$transaction(async (tx) => {
    const count = await tx.load.count({
      where: { organizationId: ctx.organizationId },
    });
    const created = await tx.load.create({
      data: {
        organizationId: ctx.organizationId,
        shipmentRequestId: quote.shipmentRequestId,
        approvedRevisionId: revision.id,
        customerId: ready.customerId,
        loadNumber: `RF-${String(count + 1).padStart(6, "0")}`,
        status: "UNCOVERED",
        commodity: ready.commodity,
        weightPounds: ready.weightPounds,
        equipmentType: ready.equipmentType,
        pickupDate: ready.pickupDate,
        deliveryDate: ready.deliveryDate,
        palletCount: quote.palletCount,
        specialInstructions: quote.specialInstructions,
        customerPriceCents: quote.amountCents,
        stops: {
          create: [
            addressStop(ctx.organizationId, "PICKUP", 1, ready.pickupAddress),
            addressStop(
              ctx.organizationId,
              "DELIVERY",
              2,
              ready.deliveryAddress,
            ),
          ],
        },
      },
    });
    await tx.quote.update({
      where: { id: quote.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptanceEvidence:
          text(form, "evidence") || "Customer acceptance recorded",
      },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: ctx.organizationId,
        actorType: "USER",
        actorId: ctx.userId,
        action: "QUOTE_ACCEPTED_LOAD_CREATED",
        entityType: "Load",
        entityId: created.id,
        afterState: { loadNumber: created.loadNumber, status: "UNCOVERED" },
        correlationId: randomUUID(),
      },
    });
    return created;
  });
  done(ctx.slug, `loads/${load.id}`);
}

function addressStop(
  organizationId: string,
  type: "PICKUP" | "DELIVERY",
  sequence: number,
  address: string,
) {
  const parts = address.split(",").map((part) => part.trim());
  return {
    organizationId,
    type,
    sequence,
    facilityName: type === "PICKUP" ? "Pickup" : "Delivery",
    addressLine1: parts[0] || address,
    city: parts[1] || "",
    state: (parts[2] || "").split(" ")[0] || "",
    postalCode: (parts[2] || "").split(" ")[1] || "",
    validationStatus: "MANUALLY_CONFIRMED" as const,
  };
}

export async function createCarrier(form: FormData) {
  const ctx = await actor(form);
  await prisma.carrier.create({
    data: {
      organizationId: ctx.organizationId,
      legalName: text(form, "legalName"),
      dbaName: text(form, "dbaName") || null,
      mcNumber: text(form, "mcNumber") || null,
      usdotNumber: text(form, "usdotNumber") || null,
      contactName: text(form, "contactName") || null,
      contactEmail: text(form, "contactEmail") || null,
      contactPhone: text(form, "contactPhone") || null,
      insuranceExpiration: text(form, "insuranceExpiration")
        ? date(text(form, "insuranceExpiration"))
        : null,
      reviewStatus: text(form, "reviewStatus") as
        | "UNREVIEWED"
        | "APPROVED"
        | "DO_NOT_USE",
      notes: text(form, "notes") || null,
    },
  });
  done(ctx.slug, "companies?type=carriers");
}

export async function updateLoad(form: FormData) {
  const ctx = await actor(form);
  const loadId = text(form, "loadId");
  const action = text(form, "operation");
  const load = await prisma.load.findFirstOrThrow({
    where: { id: loadId, organizationId: ctx.organizationId },
    include: { documents: true, customerInvoice: true, carrierBill: true },
  });
  if (action === "DAT")
    await prisma.load.update({
      where: { id: load.id },
      data: {
        datPostedAt: new Date(),
        datPostingReference:
          text(form, "datPostingReference") || "Posted manually to DAT",
        estimatedMileage: Number(text(form, "estimatedMileage")) || null,
      },
    });
  if (action === "BOOK") {
    const carrier = await prisma.carrier.findFirstOrThrow({
      where: {
        id: text(form, "carrierId"),
        organizationId: ctx.organizationId,
        reviewStatus: "APPROVED",
      },
    });
    await prisma.load.update({
      where: { id: load.id },
      data: {
        carrierId: carrier.id,
        carrierCostCents: parseUsdToCents(text(form, "carrierCost")),
        status: "BOOKED",
      },
    });
  }
  if (action === "STATUS") {
    const status = text(form, "status") as
      | "DISPATCHED"
      | "AT_PICKUP"
      | "IN_TRANSIT"
      | "AT_DELIVERY"
      | "DELIVERED"
      | "COMPLETED"
      | "CANCELLED";
    if (
      status === "DISPATCHED" &&
      (!load.carrierId ||
        !load.documents.some((d) => d.type === "SIGNED_RATE_CONFIRMATION"))
    )
      throw new Error("SIGNED_RATE_CONFIRMATION_REQUIRED");
    if (
      status === "COMPLETED" &&
      (!load.documents.some((d) => d.type === "POD") ||
        load.customerInvoice?.status !== "PAID" ||
        load.carrierBill?.status !== "PAID")
    )
      throw new Error("LOAD_NOT_READY_TO_COMPLETE");
    await prisma.load.update({
      where: { id: load.id },
      data: {
        status,
        deliveredAt: status === "DELIVERED" ? new Date() : undefined,
        deliveryReceiver:
          status === "DELIVERED" ? text(form, "deliveryReceiver") : undefined,
      },
    });
    if (status === "DELIVERED")
      await ensureInvoice(ctx.organizationId, load.id);
  }
  if (action === "EXCEPTION")
    await prisma.load.update({
      where: { id: load.id },
      data: {
        delayed: form.get("delayed") === "on",
        onHold: form.get("onHold") === "on",
        exceptionDetails: text(form, "exceptionDetails") || null,
      },
    });
  if (action === "TRACKING")
    await prisma.trackingUpdate.create({
      data: {
        organizationId: ctx.organizationId,
        loadId: load.id,
        status: text(form, "trackingStatus"),
        location: text(form, "location") || null,
        notes: text(form, "notes") || null,
        occurredAt: new Date(),
      },
    });
  await prisma.auditEvent.create({
    data: {
      organizationId: ctx.organizationId,
      actorType: "USER",
      actorId: ctx.userId,
      action: `LOAD_${action}`,
      entityType: "Load",
      entityId: load.id,
      afterState: { operation: action },
      correlationId: randomUUID(),
    },
  });
  done(ctx.slug, `loads/${load.id}`);
}

export async function uploadLoadDocument(form: FormData) {
  const ctx = await actor(form);
  const loadId = text(form, "loadId");
  await prisma.load.findFirstOrThrow({
    where: { id: loadId, organizationId: ctx.organizationId },
  });
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 5_000_000)
    throw new Error("INVALID_FILE");
  await prisma.loadDocument.create({
    data: {
      organizationId: ctx.organizationId,
      loadId,
      type: text(form, "type") as never,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      content: Buffer.from(await file.arrayBuffer()),
      uploadedById: ctx.userId,
    },
  });
  if (text(form, "type") === "POD")
    await ensureInvoice(ctx.organizationId, loadId);
  done(ctx.slug, `loads/${loadId}?tab=documents`);
}

async function ensureInvoice(organizationId: string, loadId: string) {
  const load = await prisma.load.findFirstOrThrow({
    where: { id: loadId, organizationId },
    include: { documents: true, customer: true },
  });
  if (
    load.status !== "DELIVERED" ||
    !load.documents.some((d) => d.type === "POD") ||
    !load.customerPriceCents
  )
    return;
  await prisma.customerInvoice.upsert({
    where: { loadId },
    update: {},
    create: {
      organizationId,
      loadId,
      invoiceNumber: `INV-${load.loadNumber}`,
      freightChargeCents: load.customerPriceCents,
      paymentTerms: load.customer.paymentTerms || "Net 30",
    },
  });
  await prisma.carrierBill.upsert({
    where: { loadId },
    update: {},
    create: {
      organizationId,
      loadId,
      linehaulCents: load.carrierCostCents || 0n,
    },
  });
}

export async function updateMoney(form: FormData) {
  const ctx = await actor(form);
  const loadId = text(form, "loadId");
  if (text(form, "kind") === "invoice")
    await prisma.customerInvoice.updateMany({
      where: { loadId, organizationId: ctx.organizationId },
      data: {
        status: text(form, "status") as never,
        paidCents: text(form, "paidAmount")
          ? parseUsdToCents(text(form, "paidAmount"))
          : undefined,
        sentAt: text(form, "status") === "SENT" ? new Date() : undefined,
      },
    });
  else
    await prisma.carrierBill.updateMany({
      where: { loadId, organizationId: ctx.organizationId },
      data: {
        status: text(form, "status") as never,
        carrierInvoiceNumber: text(form, "carrierInvoiceNumber") || undefined,
        accessorialsCents: text(form, "accessorials")
          ? parseUsdToCents(text(form, "accessorials"))
          : undefined,
        paidCents: text(form, "paidAmount")
          ? parseUsdToCents(text(form, "paidAmount"))
          : undefined,
      },
    });
  done(ctx.slug, `loads/${loadId}?tab=money`);
}

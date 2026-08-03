import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@atlas/db/client";
import { requireStagingWorkspace } from "@/lib/staging-workspace";
import {
  updateLoad,
  updateMoney,
  uploadLoadDocument,
} from "../../ready-actions";

const tabs = [
  "overview",
  "stops",
  "carrier",
  "updates",
  "documents",
  "money",
  "activity",
] as const;
export default async function LoadPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug, id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  )
    notFound();
  const requested = (await searchParams).tab;
  const tab = tabs.includes(requested as never) ? requested! : "overview";
  const { membership } = await requireStagingWorkspace(slug);
  const [load, carriers, activity] = await Promise.all([
    prisma.load.findFirst({
      where: { id, organizationId: membership.organizationId },
      include: {
        customer: true,
        stops: { orderBy: { sequence: "asc" } },
        carrier: true,
        driverAssignment: true,
        trackingUpdates: { orderBy: { occurredAt: "desc" } },
        documents: { orderBy: { createdAt: "desc" } },
        customerInvoice: true,
        carrierBill: true,
      },
    }),
    prisma.carrier.findMany({
      where: {
        organizationId: membership.organizationId,
        reviewStatus: "APPROVED",
      },
      orderBy: { legalName: "asc" },
    }),
    prisma.auditEvent.findMany({
      where: { organizationId: membership.organizationId, entityId: id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);
  if (!load) notFound();
  const pickup = load.stops[0],
    delivery = load.stops.at(-1);
  const price = Number(load.customerPriceCents || 0n),
    cost = Number(load.carrierCostCents || 0n);
  const hasSigned = load.documents.some(
    (d) => d.type === "SIGNED_RATE_CONFIRMATION",
  );
  return (
    <div className="ready-page">
      <header className="ready-heading">
        <div>
          <p className="overline">
            {load.status === "DRAFT"
              ? "UNCOVERED"
              : load.status.replaceAll("_", " ")}
            {load.delayed ? " · DELAYED" : ""}
            {load.onHold ? " · ON HOLD" : ""}
          </p>
          <h1>{load.loadNumber}</h1>
          <p>
            {load.customer.name} · {pickup?.city}, {pickup?.state} →{" "}
            {delivery?.city}, {delivery?.state}
          </p>
        </div>
        <div className="ready-heading-actions">
          <a
            className="button"
            href={`/api/org/${slug}/loads/${id}/rate-confirmation`}
          >
            Rate confirmation PDF
          </a>
        </div>
      </header>
      <section className="ready-load-facts">
        <Fact label="Pickup" value={load.pickupDate.toLocaleDateString()} />
        <Fact label="Delivery" value={load.deliveryDate.toLocaleDateString()} />
        <Fact label="Equipment" value={load.equipmentType} />
        <Fact
          label="Carrier"
          value={load.carrier?.legalName || "Not assigned"}
        />
        <Fact label="Customer price" value={`$${(price / 100).toFixed(2)}`} />
        <Fact
          label="Gross margin"
          value={`$${((price - cost) / 100).toFixed(2)}`}
        />
      </section>
      <nav className="ready-tabs">
        {tabs.map((name) => (
          <Link
            key={name}
            className={tab === name ? "active" : ""}
            href={`/org/${slug}/loads/${id}?tab=${name}`}
          >
            {name[0].toUpperCase() + name.slice(1)}
          </Link>
        ))}
      </nav>
      {tab === "overview" && (
        <div className="ready-two">
          <section className="panel ready-facts">
            <h2>Overview</h2>
            <dl>
              <dt>Commodity</dt>
              <dd>{load.commodity}</dd>
              <dt>Weight / pallets</dt>
              <dd>
                {load.weightPounds.toLocaleString()} lb /{" "}
                {load.palletCount || "—"}
              </dd>
              <dt>Special instructions</dt>
              <dd>{load.specialInstructions || "None"}</dd>
              <dt>Manual mileage</dt>
              <dd>{load.estimatedMileage || "Not entered"}</dd>
              <dt>DAT posting</dt>
              <dd>{load.datPostingReference || "Not posted"}</dd>
              <dt>Exception</dt>
              <dd>{load.exceptionDetails || "None"}</dd>
            </dl>
          </section>
          <section className="panel ready-actions">
            <h2>Load actions</h2>
            <form action={updateLoad}>
              <Hidden slug={slug} id={id} operation="DAT" />
              <label>
                DAT posting reference
                <input
                  name="datPostingReference"
                  placeholder="DAT post ID or note"
                />
              </label>
              <label>
                Estimated mileage
                <input type="number" name="estimatedMileage" />
              </label>
              <button className="button">Record manual DAT post</button>
            </form>
            <form action={updateLoad}>
              <Hidden slug={slug} id={id} operation="EXCEPTION" />
              <label className="check">
                <input
                  type="checkbox"
                  name="delayed"
                  defaultChecked={load.delayed}
                />{" "}
                Delayed
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  name="onHold"
                  defaultChecked={load.onHold}
                />{" "}
                On hold
              </label>
              <label>
                Details
                <input
                  name="exceptionDetails"
                  defaultValue={load.exceptionDetails || ""}
                />
              </label>
              <button className="button">Save flags</button>
            </form>
          </section>
        </div>
      )}
      {tab === "stops" && (
        <section className="panel">
          {load.stops.map((stop) => {
            const address = [
              stop.addressLine1,
              stop.city,
              stop.state,
              stop.postalCode,
            ]
              .filter(Boolean)
              .join(", ");
            return (
              <div className="ready-row" key={stop.id}>
                <span>
                  <strong>{stop.type}</strong>
                  <small>{address}</small>
                </span>
                <a
                  href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in OpenStreetMap ↗
                </a>
              </div>
            );
          })}
        </section>
      )}
      {tab === "carrier" && (
        <div className="ready-two">
          <section className="panel ready-facts">
            <h2>Booked carrier</h2>
            {load.carrier ? (
              <dl>
                <dt>Legal name</dt>
                <dd>{load.carrier.legalName}</dd>
                <dt>MC / USDOT</dt>
                <dd>
                  {load.carrier.mcNumber || "—"} /{" "}
                  {load.carrier.usdotNumber || "—"}
                </dd>
                <dt>Contact</dt>
                <dd>
                  {load.carrier.contactName || "—"} ·{" "}
                  {load.carrier.contactPhone || "—"}
                </dd>
                <dt>Carrier cost</dt>
                <dd>${(cost / 100).toFixed(2)}</dd>
                <dt>Review</dt>
                <dd>{load.carrier.reviewStatus}</dd>
              </dl>
            ) : (
              <p>No carrier booked.</p>
            )}
          </section>
          <section className="panel ready-actions">
            <h2>Booking and dispatch</h2>
            {!load.carrier && (
              <form action={updateLoad}>
                <Hidden slug={slug} id={id} operation="BOOK" />
                <label>
                  Approved carrier
                  <select name="carrierId" required>
                    <option value="">Select</option>
                    {carriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.legalName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Agreed carrier cost
                  <input name="carrierCost" required />
                </label>
                <button className="button button-primary">Book carrier</button>
              </form>
            )}
            {load.carrier && !hasSigned && (
              <p>
                <strong>Upload the signed rate confirmation</strong> before
                dispatch.
              </p>
            )}
            {load.carrier &&
              hasSigned &&
              ![
                "DISPATCHED",
                "AT_PICKUP",
                "IN_TRANSIT",
                "AT_DELIVERY",
                "DELIVERED",
                "COMPLETED",
              ].includes(load.status) && (
                <Status
                  slug={slug}
                  id={id}
                  status="DISPATCHED"
                  label="Dispatch load"
                />
              )}
          </section>
        </div>
      )}
      {tab === "updates" && (
        <div className="ready-two">
          <section className="panel ready-actions">
            <h2>Manual tracking update</h2>
            <form action={updateLoad}>
              <Hidden slug={slug} id={id} operation="TRACKING" />
              <label>
                Status
                <input
                  name="trackingStatus"
                  placeholder="Driver checked in"
                  required
                />
              </label>
              <label>
                Location
                <input name="location" />
              </label>
              <label>
                Notes
                <textarea name="notes" />
              </label>
              <button className="button">Add update</button>
            </form>
            <h2>Progress load</h2>
            {["AT_PICKUP", "IN_TRANSIT", "AT_DELIVERY", "DELIVERED"].map(
              (s) => (
                <Status
                  key={s}
                  slug={slug}
                  id={id}
                  status={s}
                  label={s.replaceAll("_", " ")}
                />
              ),
            )}
          </section>
          <section className="panel">
            {load.trackingUpdates.map((u) => (
              <div className="ready-row" key={u.id}>
                <span>
                  <strong>{u.status}</strong>
                  <small>
                    {u.location || "Location not entered"} · {u.notes}
                  </small>
                </span>
                <small>{u.occurredAt.toLocaleString()}</small>
              </div>
            ))}
          </section>
        </div>
      )}
      {tab === "documents" && (
        <div className="ready-two">
          <section className="panel ready-actions">
            <h2>Upload document</h2>
            <form action={uploadLoadDocument}>
              <input type="hidden" name="organizationSlug" value={slug} />
              <input type="hidden" name="loadId" value={id} />
              <label>
                Document type
                <select name="type">
                  {[
                    "SIGNED_RATE_CONFIRMATION",
                    "BOL",
                    "POD",
                    "CARRIER_INVOICE",
                    "LUMPER_RECEIPT",
                    "OTHER",
                  ].map((v) => (
                    <option key={v} value={v}>
                      {v.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                File
                <input type="file" name="file" required />
              </label>
              <small>Maximum 5 MB. Stored in the staging database.</small>
              <button className="button button-primary">Upload</button>
            </form>
          </section>
          <section className="panel">
            <h2>Load documents</h2>
            {!load.documents.some((d) => d.type === "POD") &&
              load.status === "DELIVERED" && (
                <p className="ready-warning">
                  POD MISSING — upload the POD to create the invoice.
                </p>
              )}
            {load.documents.map((d) => (
              <div className="ready-row" key={d.id}>
                <span>
                  <strong>{d.type.replaceAll("_", " ")}</strong>
                  <small>{d.fileName}</small>
                </span>
                <a
                  href={`/api/org/${slug}/loads/${id}/documents/${d.id}`}
                  target="_blank"
                >
                  View
                </a>
              </div>
            ))}
          </section>
        </div>
      )}
      {tab === "money" && (
        <div className="ready-two">
          <MoneyCard
            title="Customer invoice"
            status={load.customerInvoice?.status || "Not created"}
            total={
              load.customerInvoice
                ? Number(
                    load.customerInvoice.freightChargeCents +
                      load.customerInvoice.accessorialsCents,
                  )
                : price
            }
          >
            <form action={updateMoney}>
              <input type="hidden" name="organizationSlug" value={slug} />
              <input type="hidden" name="loadId" value={id} />
              <input type="hidden" name="kind" value="invoice" />
              <label>
                Status
                <select name="status">
                  <option>SENT</option>
                  <option>PARTIALLY_PAID</option>
                  <option>PAID</option>
                  <option>VOID</option>
                </select>
              </label>
              <label>
                Paid amount
                <input name="paidAmount" />
              </label>
              <button className="button">Update invoice</button>
            </form>
            {load.customerInvoice && (
              <a
                className="button"
                href={`/api/org/${slug}/loads/${id}/invoice`}
              >
                Invoice PDF
              </a>
            )}
          </MoneyCard>
          <MoneyCard
            title="Carrier bill"
            status={load.carrierBill?.status || "MISSING"}
            total={
              load.carrierBill
                ? Number(
                    load.carrierBill.linehaulCents +
                      load.carrierBill.accessorialsCents,
                  )
                : cost
            }
          >
            <form action={updateMoney}>
              <input type="hidden" name="organizationSlug" value={slug} />
              <input type="hidden" name="loadId" value={id} />
              <input type="hidden" name="kind" value="bill" />
              <label>
                Carrier invoice #<input name="carrierInvoiceNumber" />
              </label>
              <label>
                Accessorials
                <input name="accessorials" />
              </label>
              <label>
                Status
                <select name="status">
                  {[
                    "RECEIVED",
                    "UNDER_REVIEW",
                    "APPROVED",
                    "SCHEDULED",
                    "PAID",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Paid amount
                <input name="paidAmount" />
              </label>
              <button className="button">Update bill</button>
            </form>
          </MoneyCard>
          {load.customerInvoice?.status === "PAID" &&
            load.carrierBill?.status === "PAID" &&
            load.documents.some((d) => d.type === "POD") && (
              <Status
                slug={slug}
                id={id}
                status="COMPLETED"
                label="Complete load"
              />
            )}
        </div>
      )}
      {tab === "activity" && (
        <section className="panel">
          {activity.map((event) => (
            <div className="ready-row" key={event.id}>
              <strong>{event.action.replaceAll("_", " ")}</strong>
              <small>{event.createdAt.toLocaleString()}</small>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
function Hidden({
  slug,
  id,
  operation,
}: {
  slug: string;
  id: string;
  operation: string;
}) {
  return (
    <>
      <input type="hidden" name="organizationSlug" value={slug} />
      <input type="hidden" name="loadId" value={id} />
      <input type="hidden" name="operation" value={operation} />
    </>
  );
}
function Status({
  slug,
  id,
  status,
  label,
}: {
  slug: string;
  id: string;
  status: string;
  label: string;
}) {
  return (
    <form action={updateLoad}>
      <Hidden slug={slug} id={id} operation="STATUS" />
      <input type="hidden" name="status" value={status} />
      {status === "DELIVERED" && (
        <label>
          Received by
          <input name="deliveryReceiver" required />
        </label>
      )}
      <button className="button button-primary">{label}</button>
    </form>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}
function MoneyCard({
  title,
  status,
  total,
  children,
}: {
  title: string;
  status: string;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <section className="panel ready-actions">
      <h2>{title}</h2>
      <p>
        <strong>{status.replaceAll("_", " ")}</strong> · $
        {(total / 100).toFixed(2)}
      </p>
      {children}
    </section>
  );
}

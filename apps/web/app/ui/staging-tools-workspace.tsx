import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@atlas/db/client";
import { getSessionUserId } from "@/lib/session";
import { isDemoMode } from "@/lib/demo-store";
import {
  acceptQuote,
  addCandidate,
  addCommunication,
  addTracking,
  approveQuote,
  completeTask,
  confirmStop,
  createQuote,
  createTask,
  recordCall,
  recordDriver,
  selectCarrier,
  updateOwnership,
} from "@/app/org/[slug]/staging/actions";
import { effectiveRoles } from "@atlas/auth/membership";
import { ErrorAlert } from "./error-alert";
import { formatUsdFromCents } from "@/lib/currency";

const nowLocal = () => new Date().toISOString().slice(0, 16);

export async function StagingToolsWorkspace({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { slug } = await params;
  if (isDemoMode()) redirect(`/org/${slug}`);
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId, status: "ACTIVE", organization: { slug } },
    include: { organization: true, user: true, roles: true },
  });
  if (!membership) notFound();
  const roles = effectiveRoles(
    membership.role,
    membership.roles.map((item) => item.role),
  );
  if (
    !(["APPROVER", "OPERATOR", "VIEWER"] as const).every((role) =>
      roles.includes(role),
    )
  ) {
    notFound();
  }
  const organizationId = membership.organizationId;
  const [members, requests, calls, loads, tasks, audits] = await Promise.all([
    prisma.organizationMembership.findMany({
      where: { organizationId, status: "ACTIVE", user: { active: true } },
      include: { user: true, roles: true },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.shipmentRequest.findMany({
      where: { organizationId },
      include: {
        revisions: {
          orderBy: { revisionNumber: "desc" },
          take: 1,
          include: { issues: true },
        },
        quotes: { orderBy: { createdAt: "desc" } },
        load: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customerCall.findMany({
      where: { organizationId },
      orderBy: { occurredAt: "desc" },
      take: 10,
    }),
    prisma.load.findMany({
      where: { organizationId },
      include: {
        primaryOwner: true,
        stops: { orderBy: { sequence: "asc" } },
        carrierCandidates: { orderBy: { createdAt: "asc" } },
        driverAssignment: true,
        trackingUpdates: { orderBy: { occurredAt: "desc" }, take: 5 },
        communications: { orderBy: { occurredAt: "desc" }, take: 5 },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.findMany({
      where: { organizationId },
      include: { assignee: true },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    }),
    prisma.auditEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  const status = await searchParams;
  const selectedCandidates = loads.flatMap((load) =>
    load.carrierCandidates.filter(
      (candidate) => candidate.status === "SELECTED",
    ),
  );

  return (
    <main className="staging-workspace internal-tools-workspace">
      <header className="panel-heading">
        <div>
          <p className="overline">Administrator-only</p>
          <h1>Internal staging test tools</h1>
          <p className="muted">
            Signed in as {membership.user.name}. These controls exercise
            PostgreSQL-backed commands with synthetic records only.
          </p>
        </div>
        <Link className="text-button" href="/operations">
          Return to operations
        </Link>
      </header>
      {status.saved && <div className="alert success">Saved and audited.</div>}
      <ErrorAlert code={status.error} />

      <section className="panel request-panel">
        <h2>Shared employees</h2>
        <div className="load-table">
          {members.map((item) => (
            <div className="table-row" key={item.id}>
              <strong>{item.user.name}</strong>
              <span>{item.user.email}</span>
              <span>
                {effectiveRoles(
                  item.role,
                  item.roles.map((role) => role.role),
                )
                  .map(label)
                  .join(" + ")}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="workspace-grid">
        <FormCard title="Record customer call" action={recordCall} slug={slug}>
          <input
            name="customerName"
            placeholder="Synthetic customer"
            required
          />
          <input
            name="contactName"
            placeholder="Synthetic contact (optional)"
          />
          <input
            name="occurredAt"
            type="datetime-local"
            defaultValue={nowLocal()}
            required
          />
          <textarea name="notes" placeholder="Call notes" required />
        </FormCard>

        <FormCard title="Create quote" action={createQuote} slug={slug}>
          <Select
            name="shipmentRequestId"
            items={requests.map((request) => [
              request.id,
              `Request ${request.id.slice(0, 8)}`,
            ])}
          />
          <input
            name="amount"
            inputMode="decimal"
            placeholder="$2,850.00"
            required
          />
          <textarea name="assumptions" placeholder="Pricing assumptions" />
        </FormCard>

        <FormCard
          title="Enter carrier candidate"
          action={addCandidate}
          slug={slug}
        >
          <Select
            name="loadId"
            items={loads.map((load) => [load.id, load.loadNumber])}
          />
          <input
            name="carrierName"
            placeholder="Synthetic carrier business"
            required
          />
          <label>
            <input name="authorityConfirmed" type="checkbox" /> Authority
            manually confirmed
          </label>
          <label>
            <input name="insuranceConfirmed" type="checkbox" /> Insurance
            manually confirmed
          </label>
          <input
            name="cargoCoverage"
            inputMode="decimal"
            placeholder="$100,000.00 cargo coverage"
          />
          <input
            name="quotedCost"
            inputMode="decimal"
            placeholder="$2,180.00 carrier cost"
          />
        </FormCard>

        <FormCard
          title="Record driver assignment"
          action={recordDriver}
          slug={slug}
        >
          <Select
            name="loadId"
            items={loads.map((load) => [load.id, load.loadNumber])}
          />
          <Select
            name="carrierCandidateId"
            items={selectedCandidates.map((candidate) => [
              candidate.id,
              candidate.carrierName,
            ])}
          />
          <input name="driverName" placeholder="Synthetic driver" required />
          <input name="driverPhone" placeholder="Synthetic phone" />
          <input
            name="dispatcherName"
            placeholder="Synthetic dispatcher"
            required
          />
          <input name="dispatcherPhone" placeholder="Synthetic phone" />
          <input name="tractorNumber" placeholder="Tractor" />
          <input name="trailerNumber" placeholder="Trailer" />
        </FormCard>

        <FormCard
          title="Owner and next action"
          action={updateOwnership}
          slug={slug}
        >
          <Select
            name="loadId"
            items={loads.map((load) => [load.id, load.loadNumber])}
          />
          <Select
            name="primaryOwnerId"
            items={members.map((item) => [item.userId, item.user.name])}
          />
          <input name="nextAction" placeholder="Next action" required />
        </FormCard>

        <FormCard
          title="Manual tracking update"
          action={addTracking}
          slug={slug}
        >
          <Select
            name="loadId"
            items={loads.map((load) => [load.id, load.loadNumber])}
          />
          <input name="status" placeholder="Status" required />
          <input name="location" placeholder="Reported location" />
          <input
            name="occurredAt"
            type="datetime-local"
            defaultValue={nowLocal()}
            required
          />
          <textarea name="notes" placeholder="Evidence or note" />
        </FormCard>

        <FormCard
          title="Log communication"
          action={addCommunication}
          slug={slug}
        >
          <Select
            name="loadId"
            items={loads.map((load) => [load.id, load.loadNumber])}
          />
          <Select
            name="channel"
            items={[
              ["PHONE", "Phone"],
              ["EMAIL", "Email"],
              ["SMS", "SMS"],
              ["INTERNAL_NOTE", "Internal note"],
            ]}
          />
          <Select
            name="partyType"
            items={[
              ["CUSTOMER", "Customer"],
              ["CARRIER", "Carrier"],
              ["DRIVER", "Driver"],
            ]}
          />
          <input name="partyName" placeholder="Synthetic party" required />
          <Select
            name="direction"
            items={[
              ["INBOUND", "Inbound"],
              ["OUTBOUND", "Outbound"],
            ]}
          />
          <input
            name="occurredAt"
            type="datetime-local"
            defaultValue={nowLocal()}
            required
          />
          <textarea
            name="summary"
            placeholder="Communication summary"
            required
          />
        </FormCard>

        <FormCard
          title="Create task / attention item"
          action={createTask}
          slug={slug}
        >
          <Select
            name="loadId"
            optional
            items={loads.map((load) => [load.id, load.loadNumber])}
          />
          <input name="title" placeholder="Action required" required />
          <Select
            name="assigneeId"
            items={members.map((item) => [item.userId, item.user.name])}
          />
          <input name="dueAt" type="datetime-local" />
        </FormCard>
      </div>

      <section className="panel request-panel">
        <h2>Incomplete shipment details and quotes</h2>
        {requests.map((request) => (
          <article className="card" key={request.id}>
            <h3>
              Request {request.id.slice(0, 8)} · {label(request.status)}
            </h3>
            {request.revisions[0]?.issues.length ? (
              <ul>
                {request.revisions[0].issues.map((issue) => (
                  <li key={issue.id}>
                    {issue.field}: {issue.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No missing details on the current revision.</p>
            )}
            {request.quotes.map((quote) => (
              <div className="table-row" key={quote.id}>
                <strong>{formatUsdFromCents(quote.amountCents)}</strong>
                <span>{label(quote.status)}</span>
                {quote.status === "DRAFT" && quote.createdById !== userId && (
                  <form action={approveQuote}>
                    <Hidden slug={slug} />
                    <input type="hidden" name="quoteId" value={quote.id} />
                    <input
                      type="hidden"
                      name="idempotencyKey"
                      value={randomUUID()}
                    />
                    <button>Approve quote</button>
                  </form>
                )}
                {quote.status === "APPROVED" && (
                  <form action={acceptQuote}>
                    <Hidden slug={slug} />
                    <input type="hidden" name="quoteId" value={quote.id} />
                    <input
                      type="hidden"
                      name="idempotencyKey"
                      value={randomUUID()}
                    />
                    <input
                      name="evidence"
                      placeholder="Acceptance evidence"
                      required
                    />
                    <button>Record acceptance</button>
                  </form>
                )}
              </div>
            ))}
          </article>
        ))}
      </section>

      <section className="panel request-panel">
        <h2>Persistent loads</h2>
        {loads.map((load) => (
          <article className="card" key={load.id}>
            <h3>{load.loadNumber}</h3>
            <p>
              Owner: {load.primaryOwner?.name ?? "Unassigned"} · Next:{" "}
              {load.nextAction ?? "Not set"}
            </p>
            <p>
              Driver: {load.driverAssignment?.driverName ?? "Not assigned"} ·
              Dispatcher:{" "}
              {load.driverAssignment?.dispatcherName ?? "Not assigned"}
            </p>
            {load.stops.map((stop) => (
              <div className="table-row" key={stop.id}>
                <span>
                  {stop.type}: {stop.facilityName}
                </span>
                <span>
                  {stop.appointmentConfirmedAt ? "Confirmed" : "Unconfirmed"}
                </span>
                {!stop.appointmentConfirmedAt && (
                  <form action={confirmStop}>
                    <Hidden slug={slug} />
                    <input type="hidden" name="stopId" value={stop.id} />
                    <button>Confirm appointment</button>
                  </form>
                )}
              </div>
            ))}
            {load.carrierCandidates.map((candidate) => (
              <div className="table-row" key={candidate.id}>
                <strong>{candidate.carrierName}</strong>
                <span>{label(candidate.status)}</span>
                <span>
                  {candidate.blockReason ??
                    "Manual evidence accepted for staging"}
                </span>
                {candidate.status === "QUALIFIED" && (
                  <form action={selectCarrier}>
                    <Hidden slug={slug} />
                    <input
                      type="hidden"
                      name="candidateId"
                      value={candidate.id}
                    />
                    <input
                      type="hidden"
                      name="idempotencyKey"
                      value={randomUUID()}
                    />
                    <button>Select carrier</button>
                  </form>
                )}
              </div>
            ))}
            {load.trackingUpdates.map((update) => (
              <p key={update.id}>
                Tracking · {label(update.status)} ·{" "}
                {update.location ?? "No location"}
              </p>
            ))}
            {load.communications.map((item) => (
              <p key={item.id}>
                {label(item.channel)} · {label(item.partyType)} · {item.summary}
              </p>
            ))}
          </article>
        ))}
      </section>

      <section className="panel request-panel">
        <h2>Tasks and attention</h2>
        {tasks.map((task) => (
          <div className="table-row" key={task.id}>
            <strong>{task.title}</strong>
            <span>{task.assignee.name}</span>
            <span>{task.status}</span>
            {task.status === "OPEN" && (
              <form action={completeTask}>
                <Hidden slug={slug} />
                <input type="hidden" name="taskId" value={task.id} />
                <button>Complete</button>
              </form>
            )}
          </div>
        ))}
      </section>

      <section className="panel request-panel">
        <h2>Audit trail</h2>
        {audits.map((event) => (
          <div className="table-row" key={event.id}>
            <strong>{label(event.action)}</strong>
            <span>{label(event.entityType)}</span>
            <span>{event.createdAt.toISOString()}</span>
          </div>
        ))}
      </section>

      <section className="panel request-panel">
        <h2>Recent customer calls</h2>
        {calls.map((call) => (
          <div className="table-row" key={call.id}>
            <strong>{call.customerName}</strong>
            <span>{call.notes}</span>
            <span>{call.occurredAt.toISOString()}</span>
          </div>
        ))}
      </section>
    </main>
  );
}

function Hidden({ slug }: { slug: string }) {
  return (
    <>
      <input type="hidden" name="organizationSlug" value={slug} />
      <input type="hidden" name="returnPath" value="/internal/staging-tools" />
    </>
  );
}

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function FormCard({
  title,
  action,
  slug,
  children,
}: {
  title: string;
  action: (form: FormData) => Promise<void>;
  slug: string;
  children: React.ReactNode;
}) {
  return (
    <form className="card" action={action}>
      <Hidden slug={slug} />
      <h2>{title}</h2>
      {children}
      <button type="submit">Save</button>
    </form>
  );
}

function Select({
  name,
  items,
  optional = false,
}: {
  name: string;
  items: string[][];
  optional?: boolean;
}) {
  return (
    <select name={name} required={!optional}>
      <option value="">{optional ? "No load" : "Select…"}</option>
      {items.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

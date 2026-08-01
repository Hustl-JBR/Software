import Link from "next/link";
import { prisma } from "@atlas/db/client";
import { ErrorAlert } from "./error-alert";
import { signOut } from "@/app/actions";

export async function StagingCommandCenter({
  slug,
  organizationId,
  organizationName,
  userId,
  userName,
  role,
  error,
}: {
  slug: string;
  organizationId: string;
  organizationName: string;
  userId: string;
  userName: string;
  role: string;
  error?: string;
}) {
  const [requests, tasks, audits] = await Promise.all([
    prisma.shipmentRequest.findMany({
      where: { organizationId },
      include: {
        revisions: {
          orderBy: { revisionNumber: "desc" },
          take: 1,
          include: { issues: true },
        },
        quotes: { orderBy: { createdAt: "desc" }, take: 1 },
        load: {
          include: {
            customer: true,
            primaryOwner: true,
            stops: { orderBy: { sequence: "asc" } },
            carrierCandidates: true,
            driverAssignment: true,
            trackingUpdates: { orderBy: { occurredAt: "desc" }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.task.findMany({
      where: { organizationId, status: "OPEN" },
      include: { assignee: true, load: true },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 12,
    }),
    prisma.auditEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  const activeLoads = requests.flatMap((request) =>
    request.load ? [request.load] : [],
  );
  const attention = [
    ...requests.flatMap((request) => {
      const issueCount = request.revisions[0]?.issues.length ?? 0;
      if (issueCount)
        return [
          {
            id: `issues-${request.id}`,
            title: `${issueCount} shipment ${issueCount === 1 ? "detail" : "details"} missing`,
            detail: `Request ${request.id.slice(0, 8)} needs human review before approval.`,
            href: `/org/${slug}/requests/${request.id}`,
            tone: "amber",
          },
        ];
      const quote = request.quotes[0];
      if (quote?.status === "DRAFT")
        return [
          {
            id: `quote-${quote.id}`,
            title: "Quote awaiting approval",
            detail: `Request ${request.id.slice(0, 8)} has a draft quote ready for a second reviewer.`,
            href: `/org/${slug}/staging`,
            tone: "blue",
          },
        ];
      if (
        request.load &&
        !request.load.carrierCandidates.some(
          (candidate) => candidate.status === "SELECTED",
        )
      )
        return [
          {
            id: `carrier-${request.load.id}`,
            title: "Carrier review required",
            detail: `${request.load.loadNumber} does not have a selected carrier.`,
            href: `/org/${slug}/loads/${request.load.id}`,
            tone: "amber",
          },
        ];
      return [];
    }),
    ...tasks.map((task) => ({
      id: `task-${task.id}`,
      title: task.title,
      detail: `${task.assignee.name}${task.dueAt ? ` · due ${task.dueAt.toLocaleString()}` : " · no due time"}`,
      href: task.loadId
        ? `/org/${slug}/loads/${task.loadId}`
        : `/org/${slug}/staging`,
      tone: task.dueAt && task.dueAt < new Date() ? "red" : "blue",
    })),
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="overline">{organizationName} / Persistent operations</p>
          <h1>Good morning, {userName.split(" ")[0]}.</h1>
          <p className="page-subtitle">
            Real organization data · {role}{" "}
            <span className="synthetic-chip stage-chip">STAGING</span>
          </p>
        </div>
        <Link
          className="button button-primary"
          href={`/org/${slug}/requests/new`}
        >
          ＋ New shipment
        </Link>
      </div>
      <ErrorAlert code={error} />
      <section className="panel attention-panel staging-attention">
        <div className="panel-heading">
          <div>
            <p className="overline">Attention required</p>
            <h2>Work that needs a human</h2>
          </div>
          <Link className="panel-link" href={`/org/${slug}/loads`}>
            Open loads workspace →
          </Link>
        </div>
        {attention.length ? (
          <div className="staging-attention-list">
            {attention.slice(0, 8).map((item) => (
              <Link className="activity-row" href={item.href} key={item.id}>
                <span className={`activity-icon ${item.tone}`}>!</span>
                <span>
                  <b>{item.title}</b>
                  <small>{item.detail}</small>
                </span>
                <span className="inline-action">Review →</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <span>✓</span>
            <h3>No urgent work</h3>
            <p>
              Create a shipment or run the internal operations drill to populate
              the queue.
            </p>
          </div>
        )}
      </section>
      <section className="workspace-summary staging-summary">
        <DashboardSummary
          value={tasks.filter((task) => task.assigneeId === userId).length}
          label="My open tasks"
          detail="Assigned persistent work"
        />
        <DashboardSummary
          value={
            tasks.filter((task) => task.dueAt && task.dueAt < new Date()).length
          }
          label="Overdue"
          detail="Follow-up required"
        />
        <DashboardSummary
          value={activeLoads.length}
          label="Operational loads"
          detail="PostgreSQL-backed"
        />
        <DashboardSummary
          value={
            activeLoads.filter((load) => load.trackingUpdates.length > 0).length
          }
          label="Manually tracked"
          detail="No live GPS connected"
        />
      </section>
      <section className="command-grid staging-command-grid">
        <div className="panel active-loads-panel">
          <div className="panel-heading">
            <div>
              <p className="overline">Active operations</p>
              <h2>Current loads</h2>
            </div>
            <Link className="panel-link" href={`/org/${slug}/loads`}>
              View all →
            </Link>
          </div>
          {activeLoads.length ? (
            <div className="load-table">
              <div className="table-head">
                <span>Load</span>
                <span>Customer & lane</span>
                <span>Owner</span>
                <span>Tracking</span>
                <span>Status</span>
              </div>
              {activeLoads.slice(0, 6).map((load) => (
                <Link
                  className="table-row load-row"
                  href={`/org/${slug}/loads/${load.id}`}
                  key={load.id}
                >
                  <strong>{load.loadNumber}</strong>
                  <span>
                    <b>{load.customer.name}</b>
                    <small>
                      {load.stops[0]?.city ?? "Origin pending"} →{" "}
                      {load.stops.at(-1)?.city ?? "Destination pending"}
                    </small>
                  </span>
                  <span>{load.primaryOwner?.name ?? "Unassigned"}</span>
                  <span>
                    <b>{load.trackingUpdates[0]?.status ?? "Not started"}</b>
                    <small>Manual updates</small>
                  </span>
                  <span>
                    <span className="status-pill blue">{load.status}</span>
                    <small>{load.nextAction ?? "Next action not set"}</small>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span>＋</span>
              <h3>No operational loads yet</h3>
              <p>
                Approve the first complete shipment request to create a
                persistent load.
              </p>
              <Link
                className="button button-secondary"
                href={`/org/${slug}/requests/new`}
              >
                Create first shipment
              </Link>
            </div>
          )}
        </div>
        <aside className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <p className="overline">Recent activity</p>
              <h2>Persistent event feed</h2>
            </div>
          </div>
          {audits.map((event) => (
            <div className="activity-row" key={event.id}>
              <span className="activity-icon violet">✓</span>
              <span>
                <b>{event.action.replaceAll("_", " ")}</b>
                <small>
                  {event.entityType} · {event.createdAt.toLocaleString()}
                </small>
              </span>
            </div>
          ))}
        </aside>
      </section>
      <section className="panel onboarding-panel">
        <div>
          <p className="overline">Staging operations drill</p>
          <h2>Build confidence with test data only</h2>
          <p>
            Use synthetic shipments, calls, carriers, tracking updates, and
            tasks. No external provider is connected.
          </p>
        </div>
        <div className="onboarding-actions">
          <Link
            className="button button-secondary"
            href={`/org/${slug}/requests/new`}
          >
            Create shipment
          </Link>
          <Link
            className="button button-secondary"
            href={`/org/${slug}/network`}
          >
            Review carrier network
          </Link>
          <Link className="button button-ghost" href={`/org/${slug}/staging`}>
            Operations controls
          </Link>
        </div>
      </section>
      <form action={signOut}>
        <button className="text-button">Sign out</button>
      </form>
    </>
  );
}

function DashboardSummary({
  value,
  label,
  detail,
}: {
  value: number;
  label: string;
  detail: string;
}) {
  return (
    <div>
      <strong>{value}</strong>
      <p>
        <b>{label}</b>
        <small>{detail}</small>
      </p>
    </div>
  );
}

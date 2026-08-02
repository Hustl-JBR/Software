import Link from "next/link";
import { prisma } from "@atlas/db/client";
import { ErrorAlert } from "./error-alert";
import { humanizeAuditActivity, humanizeCode } from "@/lib/activity-language";

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
      include: {
        assignee: true,
        load: { include: { stops: { orderBy: { sequence: "asc" } } } },
      },
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
  const laneFor = (stops: Array<{ city: string; state: string }>) => {
    const origin = stops[0];
    const destination = stops.at(-1);
    if (!origin || !destination) return "Lane pending";
    return `${origin.city}, ${origin.state} → ${destination.city}, ${destination.state}`;
  };
  const attention = [
    ...requests.flatMap((request) => {
      const issueCount = request.revisions[0]?.issues.length ?? 0;
      if (issueCount)
        return [
          {
            id: `issues-${request.id}`,
            severity: "High",
            load:
              request.load?.loadNumber ?? `Request ${request.id.slice(0, 8)}`,
            lane: request.load
              ? laneFor(request.load.stops)
              : "Lane awaiting completion",
            issue: "Complete the missing shipment details",
            owner: request.load?.primaryOwner?.name ?? "Intake team",
            deadline: "Before approval",
            action: "Complete shipment details",
            href: `/org/${slug}/requests/${request.id}`,
            tone: "amber",
          },
        ];
      const quote = request.quotes[0];
      if (quote?.status === "DRAFT")
        return [
          {
            id: `quote-${quote.id}`,
            severity: "Review",
            load:
              request.load?.loadNumber ?? `Request ${request.id.slice(0, 8)}`,
            lane: request.load
              ? laneFor(request.load.stops)
              : "Lane awaiting completion",
            issue: "Approve the draft quote",
            owner: request.load?.primaryOwner?.name ?? "Pricing team",
            deadline: "Before customer release",
            action: "Approve quote",
            href: request.load
              ? `/org/${slug}/loads/${request.load.id}#pricing`
              : `/org/${slug}/requests/${request.id}`,
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
            severity: "High",
            load: request.load.loadNumber,
            lane: laneFor(request.load.stops),
            issue: "Assign a carrier",
            owner: request.load.primaryOwner?.name ?? "Coverage team",
            deadline: `Pickup ${request.load.pickupDate.toLocaleDateString()}`,
            action: "Assign carrier",
            href: `/org/${slug}/loads/${request.load.id}`,
            tone: "amber",
          },
        ];
      return [];
    }),
    ...tasks.map((task) => ({
      id: `task-${task.id}`,
      severity: task.dueAt && task.dueAt < new Date() ? "Overdue" : "Task",
      load: task.load?.loadNumber ?? "Operations task",
      lane: task.load ? laneFor(task.load.stops) : "General operations",
      issue: task.title,
      owner: task.assignee.name,
      deadline: task.dueAt ? task.dueAt.toLocaleString() : "No due time",
      action: "Open task",
      href: task.loadId ? `/org/${slug}/loads/${task.loadId}` : "/operations",
      tone: task.dueAt && task.dueAt < new Date() ? "red" : "blue",
    })),
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="overline">{organizationName} / Operations</p>
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
            <p className="overline">Today</p>
            <h2>Needs Attention</h2>
          </div>
          <Link className="panel-link" href={`/org/${slug}/loads`}>
            Open loads workspace →
          </Link>
        </div>
        {attention.length ? (
          <div className="staging-attention-list">
            {attention.slice(0, 5).map((item) => (
              <article
                className={`staging-attention-card ${item.tone}`}
                key={item.id}
              >
                <div className="attention-card-kicker">
                  <span className={`attention-severity ${item.tone}`}>
                    {item.severity}
                  </span>
                  <strong>{item.load}</strong>
                </div>
                <p className="attention-lane">{item.lane}</p>
                <h3>{item.issue}</h3>
                <dl className="attention-meta">
                  <div>
                    <dt>Owner</dt>
                    <dd>{item.owner}</dd>
                  </div>
                  <div>
                    <dt>Deadline</dt>
                    <dd>{item.deadline}</dd>
                  </div>
                </dl>
                <Link className="button button-secondary" href={item.href}>
                  {item.action} →
                </Link>
              </article>
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
      <section className="command-grid operations-today-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="overline">Schedule</p>
              <h2>Today’s Pickups and Deliveries</h2>
            </div>
          </div>
          {activeLoads.slice(0, 4).map((load) => (
            <Link
              className="activity-row"
              href={`/org/${slug}/loads/${load.id}#stops`}
              key={`pickup-${load.id}`}
            >
              <span className="activity-icon blue">1</span>
              <span>
                <b>
                  {load.loadNumber} ·{" "}
                  {load.stops[0]?.facilityName ?? "Facility pending"}
                </b>
                <small>
                  {load.pickupDate.toLocaleDateString()} ·{" "}
                  {load.primaryOwner?.name ?? "Owner needed"}
                </small>
              </span>
            </Link>
          ))}
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="overline">Today</p>
              <h3>Deliveries</h3>
            </div>
          </div>
          {activeLoads.slice(0, 4).map((load) => (
            <Link
              className="activity-row"
              href={`/org/${slug}/loads/${load.id}#stops`}
              key={`delivery-${load.id}`}
            >
              <span className="activity-icon green">2</span>
              <span>
                <b>
                  {load.loadNumber} ·{" "}
                  {load.stops.at(-1)?.facilityName ?? "Facility pending"}
                </b>
                <small>
                  {load.deliveryDate.toLocaleDateString()} ·{" "}
                  {load.nextAction ?? "Review next action"}
                </small>
              </span>
            </Link>
          ))}
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="overline">Customer decisions</p>
              <h2>Quotes Waiting</h2>
            </div>
          </div>
          {requests
            .filter(
              (request) =>
                request.quotes[0] && request.quotes[0].status !== "ACCEPTED",
            )
            .slice(0, 4)
            .map((request) => (
              <Link
                className="activity-row"
                href={
                  request.load
                    ? `/org/${slug}/loads/${request.load.id}#pricing`
                    : `/org/${slug}/requests/${request.id}`
                }
                key={`followup-${request.id}`}
              >
                <span className="activity-icon amber">!</span>
                <span>
                  <b>
                    {request.load?.customer.name ??
                      `Request ${request.id.slice(0, 8)}`}
                  </b>
                  <small>
                    {humanizeCode(request.quotes[0].status)} quote · customer
                    decision needed
                  </small>
                </span>
              </Link>
            ))}
        </div>
      </section>
      <section className="command-grid staging-command-grid">
        <aside className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <p className="overline">Updates</p>
              <h2>Recent Activity</h2>
            </div>
          </div>
          {audits.map((event) => (
            <div className="activity-row" key={event.id}>
              <span className="activity-icon violet">✓</span>
              <span>
                <b>
                  {humanizeAuditActivity({
                    action: event.action,
                    actorName:
                      event.actorId === userId ? userName : "A team member",
                  })}
                </b>
                <small>
                  {humanizeCode(event.entityType)} ·{" "}
                  {event.createdAt.toLocaleString()}
                </small>
              </span>
            </div>
          ))}
        </aside>
      </section>
    </>
  );
}

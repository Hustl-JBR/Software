import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@atlas/db/client";
import { getSessionUserId } from "@/lib/session";
import { isDemoMode } from "@/lib/demo-store";
import {
  EnvironmentChip,
  EmptyState,
  StatusBadge,
} from "@/app/ui/atlas-primitives";
import { shortDate } from "@/lib/atlas-view-models";

export default async function Operations() {
  if (isDemoMode()) redirect("/org/atlas-north/loads");
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId, status: "ACTIVE", user: { active: true } },
    include: { organization: true },
  });
  if (!membership) redirect("/sign-in");
  const organizationId = membership.organizationId;
  const slug = membership.organization.slug;
  const [loads, requests, tasks] = await Promise.all([
    prisma.load.findMany({
      where: { organizationId },
      include: {
        customer: true,
        primaryOwner: true,
        stops: { orderBy: { sequence: "asc" } },
        carrierCandidates: true,
      },
      orderBy: [{ pickupDate: "asc" }, { createdAt: "desc" }],
      take: 30,
    }),
    prisma.shipmentRequest.findMany({
      where: { organizationId, load: null },
      include: {
        revisions: {
          orderBy: { revisionNumber: "desc" },
          take: 1,
          include: { issues: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),
    prisma.task.findMany({
      where: { organizationId, status: "OPEN" },
      include: { assignee: true, load: true },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 12,
    }),
  ]);
  const blockers = loads.filter(
    (load) =>
      !load.primaryOwnerId ||
      !load.carrierCandidates.some(
        (candidate) => candidate.status === "SELECTED",
      ),
  ).length;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="overline">Employee workspace</p>
          <h1>Operations</h1>
          <p className="page-subtitle">
            Review today&apos;s freight, ownership, and next actions.{" "}
            <EnvironmentChip mode="staging" />
          </p>
        </div>
        <Link
          className="button button-primary"
          href={`/org/${slug}/requests/new`}
        >
          ＋ New shipment
        </Link>
      </div>
      <section
        className="workspace-summary operations-summary"
        aria-label="Operations summary"
      >
        <Summary value={loads.length} label="Active records" />
        <Summary value={requests.length} label="Intake review" />
        <Summary value={tasks.length} label="Open tasks" />
        <Summary value={blockers} label="Readiness blockers" />
      </section>
      <section className="panel operations-index-panel">
        <div className="panel-heading">
          <div>
            <p className="overline">Load execution</p>
            <h2>Loads requiring attention</h2>
          </div>
          <Link className="panel-link" href={`/org/${slug}/loads`}>
            View all loads →
          </Link>
        </div>
        {loads.length ? (
          <div className="load-table">
            {loads.map((load) => {
              const origin = load.stops[0];
              const destination = load.stops.at(-1);
              const selected = load.carrierCandidates.some(
                (candidate) => candidate.status === "SELECTED",
              );
              return (
                <Link
                  className="table-row operations-index-row"
                  href={`/org/${slug}/loads/${load.id}`}
                  key={load.id}
                >
                  <strong>{load.loadNumber}</strong>
                  <span>{load.customer.name}</span>
                  <span>
                    {origin?.city ?? "Origin pending"} →{" "}
                    {destination?.city ?? "Destination pending"}
                  </span>
                  <span>{shortDate(load.pickupDate)}</span>
                  <span>{load.primaryOwner?.name ?? "Owner needed"}</span>
                  <StatusBadge
                    label={selected ? humanize(load.status) : "Carrier needed"}
                    tone={selected ? "blue" : "amber"}
                  />
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No loads yet"
            body="Approve a complete shipment to create the first operational load."
          />
        )}
      </section>
      <div className="command-grid operations-lower-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="overline">Intake</p>
              <h2>Shipment reviews</h2>
            </div>
          </div>
          {requests.length ? (
            requests.map((request) => (
              <Link
                className="activity-row"
                href={`/org/${slug}/requests/${request.id}`}
                key={request.id}
              >
                <span className="activity-icon amber">!</span>
                <span>
                  <b>Request {request.id.slice(0, 8)}</b>
                  <small>
                    {request.revisions[0]?.issues.length ?? 0} details need
                    review
                  </small>
                </span>
              </Link>
            ))
          ) : (
            <EmptyState
              title="No intake waiting"
              body="All current requests have moved into operations."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="overline">My work today</p>
              <h2>Open tasks</h2>
            </div>
          </div>
          {tasks.length ? (
            tasks.map((task) => (
              <Link
                className="activity-row"
                href={
                  task.loadId
                    ? `/org/${slug}/loads/${task.loadId}`
                    : "/operations"
                }
                key={task.id}
              >
                <span className="activity-icon blue">✓</span>
                <span>
                  <b>{task.title}</b>
                  <small>
                    {task.assignee.name}
                    {task.dueAt
                      ? ` · due ${task.dueAt.toLocaleString()}`
                      : " · no due date"}
                  </small>
                </span>
              </Link>
            ))
          ) : (
            <EmptyState
              title="No open tasks"
              body="New assigned work will appear here."
            />
          )}
        </section>
      </div>
    </>
  );
}

function Summary({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <p>
        <b>{label}</b>
        <small>Organization scoped</small>
      </p>
    </div>
  );
}

function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}

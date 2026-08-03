import Link from "next/link";
import { prisma } from "@atlas/db/client";
import { isDemoMode } from "@/lib/demo-store";
import { requireStagingWorkspace } from "@/lib/staging-workspace";

export default async function TodayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (isDemoMode()) return <DemoToday slug={slug} />;
  const { membership } = await requireStagingWorkspace(slug);
  const organizationId = membership.organizationId;
  const [loads, waitingQuotes, tasks, activity] = await Promise.all([
    prisma.load.findMany({
      where: { organizationId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      include: {
        customer: true,
        stops: { orderBy: { sequence: "asc" } },
        carrier: true,
        documents: true,
      },
      orderBy: { pickupDate: "asc" },
      take: 10,
    }),
    prisma.quote.findMany({
      where: {
        organizationId,
        status: { in: ["DRAFT", "SENT", "AWAITING_CUSTOMER"] },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.task.findMany({
      where: { organizationId, status: "OPEN" },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      take: 5,
    }),
    prisma.auditEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);
  const attention = [
    ...tasks.map((task) => ({
      id: task.id,
      label: task.title,
      href: task.loadId ? `/org/${slug}/loads/${task.loadId}` : `/org/${slug}`,
    })),
    ...loads
      .filter((load) => load.status === "UNCOVERED" || load.status === "DRAFT")
      .map((load) => ({
        id: load.id,
        label: "Assign a carrier",
        href: `/org/${slug}/loads/${load.id}`,
      })),
    ...loads
      .filter(
        (load) =>
          load.status === "DELIVERED" &&
          !load.documents.some((doc) => doc.type === "POD"),
      )
      .map((load) => ({
        id: `${load.id}-pod`,
        label: "Upload the POD",
        href: `/org/${slug}/loads/${load.id}?tab=documents`,
      })),
  ].slice(0, 5);
  return (
    <div className="ready-page">
      <header className="ready-heading">
        <div>
          <p className="overline">
            Internal operating system for Ready Freight
          </p>
          <h1>Today</h1>
          <p>
            What needs action, what is moving, and what customers are waiting
            on.
          </p>
        </div>
        <Link className="button button-primary" href={`/org/${slug}/quotes`}>
          New quote
        </Link>
      </header>
      <section className="ready-grid">
        <Panel title="Needs Attention">
          {attention.length ? (
            attention.map((item) => (
              <Link className="ready-row" key={item.id} href={item.href}>
                <strong>{item.label}</strong>
                <span>Open →</span>
              </Link>
            ))
          ) : (
            <Empty>Nothing is blocked.</Empty>
          )}
        </Panel>
        <Panel title="Today’s Pickups and Deliveries">
          {loads.slice(0, 5).map((load) => (
            <Link
              className="ready-row"
              key={load.id}
              href={`/org/${slug}/loads/${load.id}`}
            >
              <span>
                <strong>{load.loadNumber}</strong> · {load.customer.name}
              </span>
              <span>{label(load.status)}</span>
            </Link>
          ))}
        </Panel>
        <Panel title="Quotes Waiting">
          {waitingQuotes.map((quote) => (
            <Link
              className="ready-row"
              key={quote.id}
              href={`/org/${slug}/quotes/${quote.id}`}
            >
              <strong>{quote.quoteNumber || "Draft quote"}</strong>
              <span>{label(quote.status)}</span>
            </Link>
          ))}
        </Panel>
        <Panel title="Recent Activity">
          {activity.map((event) => (
            <div className="ready-row" key={event.id}>
              <span>{label(event.action)}</span>
              <small>{event.createdAt.toLocaleString()}</small>
            </div>
          ))}
        </Panel>
      </section>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel ready-panel">
      <div className="panel-heading">
        <h2>{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="ready-empty">{children}</p>;
}
function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function DemoToday({ slug }: { slug: string }) {
  return (
    <div className="ready-page">
      <header className="ready-heading">
        <div>
          <p className="overline">
            Internal operating system for Ready Freight
          </p>
          <h1>Today</h1>
          <p>
            Demo access is ready. Sign in to staging to review persistent
            operations.
          </p>
        </div>
        <Link className="button button-primary" href={`/org/${slug}/quotes`}>
          Quotes
        </Link>
      </header>
      <section className="ready-grid">
        <Panel title="Needs Attention">
          <Empty>Confirm pickup appointment</Empty>
        </Panel>
        <Panel title="Today’s Pickups and Deliveries">
          <Empty>No demo loads today.</Empty>
        </Panel>
        <Panel title="Quotes Waiting">
          <Empty>No quotes waiting.</Empty>
        </Panel>
        <Panel title="Recent Activity">
          <Empty>Demo workspace opened.</Empty>
        </Panel>
      </section>
    </div>
  );
}

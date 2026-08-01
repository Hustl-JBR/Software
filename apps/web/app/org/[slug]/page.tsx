import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@atlas/db/client";
import { getSessionUserId } from "@/lib/session";
import { signOut } from "../../actions";
import { ErrorAlert } from "@/app/ui/error-alert";
import { AttentionQueue } from "@/app/ui/attention-queue";
import {
  DEMO_ORGANIZATION,
  DEMO_USER,
  getDemoRequests,
  isDemoMode,
} from "@/lib/demo-store";

const activeLoads = [
  {
    id: "ATL-4821",
    customer: "Hawthorne Home",
    lane: "Nashville → Atlanta",
    carrier: "Summit Freight",
    status: "In transit",
    time: "3h 42m",
    progress: 64,
    tone: "green",
  },
  {
    id: "ATL-4818",
    customer: "Meridian Foods",
    lane: "Chicago → Columbus",
    carrier: "BlueLine Logistics",
    status: "At pickup",
    time: "42m",
    progress: 24,
    tone: "blue",
  },
  {
    id: "ATL-4812",
    customer: "Northstar Retail",
    lane: "Dallas → Memphis",
    carrier: "Redwood Transport",
    status: "Delayed",
    time: "+1h 18m",
    progress: 47,
    tone: "amber",
  },
  {
    id: "ATL-4809",
    customer: "Apex Industrial",
    lane: "Charlotte → Richmond",
    carrier: "Vector Carrier Co.",
    status: "Delivered",
    time: "9:24 AM",
    progress: 100,
    tone: "slate",
  },
];

export default async function Dashboard({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  if (isDemoMode()) {
    if (slug !== DEMO_ORGANIZATION.slug) notFound();
    return <DemoDashboard slug={slug} error={(await searchParams).error} />;
  }
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId, status: "ACTIVE", organization: { slug } },
    include: { organization: true, user: true },
  });
  if (!membership) notFound();
  const requests = await prisma.shipmentRequest.findMany({
    where: { organizationId: membership.organizationId },
    include: {
      revisions: { orderBy: { revisionNumber: "desc" }, take: 1 },
      load: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return (
    <>
      <PageHeading
        slug={slug}
        name={membership.organization.name}
        subtitle={`Signed in as ${membership.user.name} · ${membership.role}`}
      />
      <ErrorAlert code={(await searchParams).error} />
      <section className="panel request-panel">
        <div className="panel-heading">
          <div>
            <p className="overline">PostgreSQL workspace</p>
            <h2>Persistent staging operations</h2>
          </div>
          <Link className="primary-button" href={`/org/${slug}/staging`}>
            Open staging workspace
          </Link>
        </div>
      </section>
      <section className="panel request-panel">
        <div className="panel-heading">
          <div>
            <p className="overline">Intake queue</p>
            <h2>Shipment requests</h2>
          </div>
        </div>
        <div className="load-table">
          {requests.map((request) => (
            <a
              className="table-row"
              href={
                request.load
                  ? `/org/${slug}/loads/${request.load.id}`
                  : `/org/${slug}/requests/${request.id}`
              }
              key={request.id}
            >
              <strong>Request {request.id.slice(0, 8)}</strong>
              <span>Revision {request.currentRevisionNumber}</span>
              <span className={`status-pill ${request.status.toLowerCase()}`}>
                {request.status.replace("_", " ")}
              </span>
            </a>
          ))}
        </div>
      </section>
      <form action={signOut}>
        <button className="text-button">Sign out</button>
      </form>
    </>
  );
}

function PageHeading({
  slug,
  name,
  subtitle,
}: {
  slug: string;
  name: string;
  subtitle: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="overline">{name} / Live operations</p>
        <h1>Good morning, Jordan.</h1>
        <p className="page-subtitle">
          {subtitle}{" "}
          <span className="live-indicator">
            <i /> Live
          </span>
        </p>
      </div>
      <a className="button button-primary" href={`/org/${slug}/requests/new`}>
        <span>＋</span> New shipment
      </a>
    </div>
  );
}

function DemoDashboard({ slug, error }: { slug: string; error?: string }) {
  const requests = getDemoRequests();
  return (
    <>
      <PageHeading
        slug={slug}
        name={DEMO_ORGANIZATION.name}
        subtitle={`${DEMO_USER.name} · Thursday, July 31`}
      />
      <ErrorAlert code={error} />
      <AttentionQueue slug={slug} />
      <section className="metrics-grid" aria-label="Operations metrics">
        <Metric
          label="Today's revenue"
          value="$48,240"
          delta="+12.4%"
          spark="revenue"
        />
        <Metric
          label="Gross profit"
          value="$8,684"
          detail="18.0% margin"
          spark="profit"
        />
        <Metric
          label="Loads in transit"
          value="12"
          detail="4 arriving today"
          spark="loads"
        />
        <Metric
          label="Awaiting approval"
          value="3"
          detail="Oldest · 47 min"
          attention
          spark="approval"
        />
      </section>

      <section className="command-grid">
        <div className="panel map-panel">
          <div className="panel-heading">
            <div>
              <p className="overline">Network pulse</p>
              <h2>Live load movement</h2>
            </div>
            <span className="small-select">United States⌄</span>
          </div>
          <div
            className="network-map"
            aria-label="Stylized live freight network map"
          >
            <div className="map-grid" />
            <div className="route-path route-one" />
            <div className="route-path route-two" />
            <div className="route-path route-three" />
            <MapPoint className="nashville" city="Nashville" count="4" />
            <MapPoint className="atlanta" city="Atlanta" count="6" />
            <MapPoint className="chicago" city="Chicago" count="3" />
            <MapPoint className="dallas" city="Dallas" count="2" />
            <MapPoint className="charlotte" city="Charlotte" count="2" />
            <div className="map-legend">
              <span>
                <i className="green-dot" /> On time 9
              </span>
              <span>
                <i className="amber-dot" /> At risk 2
              </span>
              <span>
                <i className="red-dot" /> Delayed 1
              </span>
            </div>
          </div>
        </div>
        <aside className="panel intelligence-panel">
          <div className="panel-heading">
            <div>
              <p className="overline violet">Atlas intelligence</p>
              <h2>AI recommendations</h2>
            </div>
            <span className="ai-orb">✦</span>
          </div>
          <Insight
            tone="critical"
            title="Protect the Dallas → Memphis load"
            body="Weather near Little Rock may add 75–90 minutes. Notify Northstar Retail now."
            action="Review load"
          />
          <Insight
            tone="opportunity"
            title="Margin opportunity"
            body="Two Nashville pickups can be bundled. Estimated savings: $640."
            action="View opportunity"
          />
          <Insight
            tone="neutral"
            title="3 requests ready to approve"
            body="All required data is present and confidence is above 94%."
            action="Open queue"
          />
        </aside>
      </section>

      <section className="panel active-loads-panel">
        <div className="panel-heading">
          <div>
            <p className="overline">Execution</p>
            <h2>Active loads</h2>
          </div>
          <a className="panel-link" href="#requests">
            View all loads →
          </a>
        </div>
        <div className="load-table">
          <div className="table-head">
            <span>Load</span>
            <span>Customer & lane</span>
            <span>Carrier</span>
            <span>Progress</span>
            <span>Status</span>
          </div>
          {activeLoads.map((load) => (
            <div className="table-row load-row" key={load.id}>
              <strong>{load.id}</strong>
              <span>
                <b>{load.customer}</b>
                <small>{load.lane}</small>
              </span>
              <span>{load.carrier}</span>
              <span className="progress-cell">
                <i>
                  <b style={{ width: `${load.progress}%` }} />
                </i>
                <small>{load.progress}%</small>
              </span>
              <span>
                <span className={`status-pill ${load.tone}`}>
                  {load.status}
                </span>
                <small>{load.time}</small>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="lower-grid">
        <div className="panel schedule-panel">
          <div className="panel-heading">
            <div>
              <p className="overline">Next 6 hours</p>
              <h2>Upcoming appointments</h2>
            </div>
          </div>
          <Schedule
            time="11:30"
            type="Pickup"
            facility="Atlas Nashville Warehouse"
            load="ATL-4825"
          />
          <Schedule
            time="13:00"
            type="Delivery"
            facility="Georgia Pacific DC"
            load="ATL-4816"
          />
          <Schedule
            time="14:45"
            type="Pickup"
            facility="Meridian Foods · Cicero"
            load="ATL-4828"
          />
        </div>
        <div className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <p className="overline">Live feed</p>
              <h2>Recent activity</h2>
            </div>
          </div>
          <Activity
            icon="✓"
            title="POD received"
            detail="ATL-4809 · 4 min ago"
            tone="green"
          />
          <Activity
            icon="↗"
            title="Carrier checked in at pickup"
            detail="ATL-4818 · 12 min ago"
            tone="blue"
          />
          <Activity
            icon="!"
            title="Weather risk detected"
            detail="ATL-4812 · 18 min ago"
            tone="amber"
          />
          <Activity
            icon="✦"
            title="AI completed shipment analysis"
            detail="Request 9f21c8 · 26 min ago"
            tone="violet"
          />
        </div>
      </section>

      <section className="panel request-panel" id="requests">
        <div className="panel-heading">
          <div>
            <p className="overline">Your demo session</p>
            <h2>Shipment requests</h2>
          </div>
          <span className="session-note">
            Synthetic data resets with the server
          </span>
        </div>
        {requests.length === 0 ? (
          <div className="empty-state">
            <span>＋</span>
            <h3>No demo requests yet</h3>
            <p>
              Start with a plain-English shipment and let Atlas structure the
              work.
            </p>
            <a
              className="button button-secondary"
              href={`/org/${slug}/requests/new`}
            >
              Create first request
            </a>
          </div>
        ) : (
          <div className="load-table">
            {requests.map((request) => (
              <a
                className="table-row request-row"
                href={
                  request.loadId
                    ? `/org/${slug}/loads/${request.loadId}`
                    : `/org/${slug}/requests/${request.id}`
                }
                key={request.id}
              >
                <span>
                  <b>Request {request.id.slice(0, 8)}</b>
                  <small>Created moments ago</small>
                </span>
                <span>Revision {request.currentRevisionNumber}</span>
                <span className={`status-pill ${request.status.toLowerCase()}`}>
                  {request.status.replace("_", " ")}
                </span>
                <span>Open →</span>
              </a>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Metric({
  label,
  value,
  delta,
  detail,
  attention,
  spark,
}: {
  label: string;
  value: string;
  delta?: string;
  detail?: string;
  attention?: boolean;
  spark: string;
}) {
  return (
    <article className={`metric-card ${attention ? "metric-attention" : ""}`}>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small className={delta ? "positive" : ""}>{delta ?? detail}</small>
      </div>
      <div className={`sparkline ${spark}`}>
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
    </article>
  );
}
function MapPoint({
  className,
  city,
  count,
}: {
  className: string;
  city: string;
  count: string;
}) {
  return (
    <div className={`map-point ${className}`}>
      <span>{count}</span>
      <small>{city}</small>
    </div>
  );
}
function Insight({
  tone,
  title,
  body,
  action,
}: {
  tone: string;
  title: string;
  body: string;
  action: string;
}) {
  return (
    <article className={`insight ${tone}`}>
      <span className="insight-icon">
        {tone === "critical" ? "!" : tone === "opportunity" ? "↗" : "✓"}
      </span>
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
        <button className="inline-action">{action} →</button>
      </div>
    </article>
  );
}
function Schedule({
  time,
  type,
  facility,
  load,
}: {
  time: string;
  type: string;
  facility: string;
  load: string;
}) {
  return (
    <div className="schedule-row">
      <time>{time}</time>
      <i />
      <span>
        <b>
          {type} · {facility}
        </b>
        <small>{load}</small>
      </span>
      <span className="status-pill slate">Confirmed</span>
    </div>
  );
}
function Activity({
  icon,
  title,
  detail,
  tone,
}: {
  icon: string;
  title: string;
  detail: string;
  tone: string;
}) {
  return (
    <div className="activity-row">
      <span className={`activity-icon ${tone}`}>{icon}</span>
      <span>
        <b>{title}</b>
        <small>{detail}</small>
      </span>
    </div>
  );
}

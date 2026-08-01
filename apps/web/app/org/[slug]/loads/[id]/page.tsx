import { notFound, redirect } from "next/navigation";
import { prisma } from "@atlas/db/client";
import { getSessionUserId } from "@/lib/session";
import { DEMO_ORGANIZATION, getDemoLoad, isDemoMode } from "@/lib/demo-store";
import { initialOperationsDemoState } from "@/lib/operations-demo-data";
import { DemoLoadOperations } from "@/app/ui/demo-load-operations";

type LoadView = {
  id: string;
  loadNumber: string;
  status: string;
  customer: { name: string };
  commodity: string;
  weightPounds: number;
  equipmentType: string;
  pickupDate: Date;
  deliveryDate: Date;
  approvedRevision: { revisionNumber: number };
  stops: Array<{
    id: string;
    sequence: number;
    type: string;
    facilityName: string;
    city: string;
    state: string;
    postalCode: string;
  }>;
  audits: Array<{
    id: string;
    action: string;
    entityType: string;
    correlationId: string;
    createdAt: Date;
  }>;
};

export default async function LoadDetail({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  if (
    isDemoMode() &&
    slug === DEMO_ORGANIZATION.slug &&
    initialOperationsDemoState.loads.some((load) => load.id === id)
  ) {
    return <DemoLoadOperations loadId={id} slug={slug} />;
  }
  const load = isDemoMode()
    ? demoLoadView(slug, id)
    : await realLoadView(slug, id);
  if (!load) notFound();
  return (
    <>
      <div className="breadcrumb">
        <a href={`/org/${slug}`}>Command center</a>
        <span>/</span>
        <a href={`/org/${slug}`}>Loads</a>
        <span>/</span>
        <strong>{load.loadNumber}</strong>
      </div>
      <div className="load-hero">
        <div>
          <div className="title-line">
            <p className="overline">Draft load created</p>
            <span className="status-pill green">{load.status}</span>
          </div>
          <h1>{load.loadNumber}</h1>
          <p>
            {load.customer.name} <span>·</span> {load.commodity} <span>·</span>{" "}
            {load.weightPounds.toLocaleString()} lb
          </p>
        </div>
        <div className="load-actions">
          <button className="button button-ghost">•••</button>
          <button className="button button-secondary">Share load</button>
          <button className="button button-primary">
            Begin execution <span>→</span>
          </button>
        </div>
      </div>
      <nav className="content-tabs load-tabs">
        <a className="active" href="#overview">
          Overview
        </a>
        <a href="#stops">
          Stops <b>2</b>
        </a>
        <span>
          Documents <b>0</b>
        </span>
        <span>
          Communications <b>0</b>
        </span>
        <a href="#timeline">Timeline</a>
        <a href="#audit">Audit</a>
        <a href="#analysis">AI analysis</a>
      </nav>

      <section className="load-layout" id="overview">
        <div className="load-main">
          <article className="panel route-overview" id="stops">
            <div className="panel-heading">
              <div>
                <p className="overline">Route overview</p>
                <h2>Nashville, TN → Atlanta, GA</h2>
              </div>
              <span className="route-distance">248 miles · 3h 48m</span>
            </div>
            <div className="mini-map">
              <div className="map-grid" />
              <div className="route-arc" />
              <span className="route-pin origin-pin">
                1<small>Nashville</small>
              </span>
              <span className="route-pin destination-pin">
                2<small>Atlanta</small>
              </span>
              <span className="truck-marker">▰</span>
            </div>
            <div className="stop-cards">
              {load.stops.map((stop) => (
                <article className="stop-card" key={stop.id}>
                  <div className="stop-card-top">
                    <span className={`stop-number ${stop.type.toLowerCase()}`}>
                      {stop.sequence}
                    </span>
                    <div>
                      <p className="overline">{stop.type}</p>
                      <h3>{stop.facilityName}</h3>
                    </div>
                    <span className="status-pill slate">Scheduled</span>
                  </div>
                  <address>
                    {stop.city}, {stop.state} {stop.postalCode}
                  </address>
                  <div className="stop-meta">
                    <span>
                      <small>Appointment</small>
                      <b>
                        {stop.type === "PICKUP"
                          ? "Aug 5 · 08:00–10:00"
                          : "Aug 6 · 09:00–11:00"}
                      </b>
                    </span>
                    <span>
                      <small>Contact</small>
                      <b>
                        {stop.type === "PICKUP"
                          ? "Maria Lopez"
                          : "Receiving desk"}
                      </b>
                    </span>
                  </div>
                  <div className="stop-footer">
                    <span>
                      <i /> Awaiting arrival
                    </span>
                    <button className="inline-action">
                      View stop details →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="panel shipment-overview">
            <div className="panel-heading">
              <div>
                <p className="overline">Freight profile</p>
                <h2>Shipment information</h2>
              </div>
              <span className="verified-chip">✓ Human verified</span>
            </div>
            <div className="overview-facts">
              <Fact label="Customer" value={load.customer.name} icon="◫" />
              <Fact label="Commodity" value={load.commodity} icon="◇" />
              <Fact
                label="Weight"
                value={`${load.weightPounds.toLocaleString()} lb`}
                icon="▥"
              />
              <Fact label="Equipment" value="53′ Dry van" icon="▰" />
              <Fact label="Pickup" value={date(load.pickupDate)} icon="◷" />
              <Fact label="Delivery" value={date(load.deliveryDate)} icon="◷" />
              <Fact
                label="Approved revision"
                value={`#${load.approvedRevision.revisionNumber}`}
                icon="✓"
              />
              <Fact label="Pallets" value="18" icon="▦" />
            </div>
          </article>

          <article className="panel mission-timeline" id="timeline">
            <div className="panel-heading">
              <div>
                <p className="overline">Mission timeline</p>
                <h2>What happened</h2>
                <p>Every consequential event, in human language.</p>
              </div>
              <span className="immutable-chip">◈ Immutable</span>
            </div>
            <div className="mission-events">
              {load.audits.map((event, index) => (
                <MissionEvent
                  key={event.id}
                  event={event}
                  index={index}
                  last={index === load.audits.length - 1}
                />
              ))}
            </div>
          </article>
        </div>

        <aside className="load-aside">
          <section className="panel load-status-card">
            <div className="status-ring">
              <span>DRAFT</span>
              <small>Ready</small>
            </div>
            <h2>Ready for execution</h2>
            <p>
              Shipment data is complete. Assign a carrier and confirm
              appointments when you are ready.
            </p>
            <div className="readiness">
              <span>
                <i className="done" /> Shipment approved
              </span>
              <span>
                <i className="done" /> Stops created
              </span>
              <span>
                <i /> Carrier assignment
              </span>
              <span>
                <i /> Appointment confirmation
              </span>
            </div>
          </section>
          <section className="panel load-ai-card" id="analysis">
            <div className="panel-heading">
              <div>
                <p className="overline violet">Atlas intelligence</p>
                <h2>Load analysis</h2>
              </div>
              <span className="ai-orb">✦</span>
            </div>
            <div className="analysis-score">
              <strong>96</strong>
              <span>
                <b>Low operational risk</b>
                <small>Confidence score</small>
              </span>
            </div>
            <div className="ai-callout">
              <span>↗</span>
              <p>
                <b>Strong Nashville–Atlanta lane</b>
                <small>
                  Carrier availability is typically highest before noon.
                </small>
              </p>
            </div>
            <div className="ai-callout warning-callout">
              <span>!</span>
              <p>
                <b>Confirm appointment windows</b>
                <small>Both stops currently use suggested demo windows.</small>
              </p>
            </div>
          </section>
          <section className="panel team-card">
            <div className="panel-heading">
              <div>
                <p className="overline">Ownership</p>
                <h2>Load team</h2>
              </div>
            </div>
            <div className="owner-row">
              <span className="avatar purple">DA</span>
              <p>
                <b>Demo Approver</b>
                <small>Operations lead</small>
              </p>
              <span className="presence" />
            </div>
            <button className="button button-ghost full-button">
              ＋ Add teammate
            </button>
          </section>
          <section className="panel audit-proof" id="audit">
            <span>◈</span>
            <div>
              <p className="overline">Audit integrity</p>
              <h3>Protected by Atlas</h3>
              <p>
                7 immutable events · Correlation{" "}
                {load.audits[0]?.correlationId.slice(0, 8)}
              </p>
            </div>
          </section>
        </aside>
      </section>
    </>
  );
}

function Fact({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="overview-fact">
      <span>{icon}</span>
      <p>
        <small>{label}</small>
        <b>{value}</b>
      </p>
    </div>
  );
}
function date(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
const eventCopy: Record<
  string,
  { title: string; description: string; icon: string; tone: string }
> = {
  SHIPMENT_REQUEST_CREATED: {
    title: "Shipment request received",
    description:
      "Atlas created a secure intake record from the original request.",
    icon: "+",
    tone: "blue",
  },
  MOCK_EXTRACTION_COMPLETED: {
    title: "Atlas completed its analysis",
    description:
      "Shipment facts were extracted and missing information was surfaced.",
    icon: "✦",
    tone: "violet",
  },
  REVISION_CORRECTED: {
    title: "Shipment details reviewed",
    description:
      "A human operator corrected the data and saved an immutable revision.",
    icon: "✓",
    tone: "blue",
  },
  APPROVAL_ACCEPTED: {
    title: "Exact revision approved",
    description: "Revision 2 was approved by Demo Approver.",
    icon: "✓",
    tone: "green",
  },
  DRAFT_LOAD_CREATED: {
    title: "Draft load created",
    description: "Atlas created the operational load without partial records.",
    icon: "▰",
    tone: "green",
  },
  STOPS_CREATED: {
    title: "Pickup and delivery created",
    description: "Two sequenced stops were added to the route.",
    icon: "↗",
    tone: "green",
  },
  LOAD_STATUS_INITIALIZED: {
    title: "Load is ready for execution",
    description:
      "The load entered Draft status and is ready for carrier assignment.",
    icon: "●",
    tone: "green",
  },
};
function MissionEvent({
  event,
  index,
  last,
}: {
  event: LoadView["audits"][number];
  index: number;
  last: boolean;
}) {
  const copy = eventCopy[event.action] ?? {
    title: event.action.replaceAll("_", " "),
    description: event.entityType,
    icon: "·",
    tone: "slate",
  };
  return (
    <div className={`mission-event ${last ? "latest" : ""}`}>
      <div className="event-rail">
        <span className={copy.tone}>{copy.icon}</span>
        <i />
      </div>
      <div className="event-card">
        <div>
          <h3>{copy.title}</h3>
          <p>{copy.description}</p>
        </div>
        <time>
          {index === 0 ? "10:02 AM" : `10:0${index + 2} AM`}
          <small>Today</small>
        </time>
        {last && <b className="latest-tag">Latest</b>}
        <details>
          <summary>Event details</summary>
          <code>
            {event.action} · {event.entityType}
          </code>
        </details>
      </div>
    </div>
  );
}
function demoLoadView(slug: string, id: string): LoadView | undefined {
  if (slug !== DEMO_ORGANIZATION.slug) return undefined;
  return getDemoLoad(id);
}
async function realLoadView(
  slug: string,
  id: string,
): Promise<LoadView | undefined> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId, status: "ACTIVE", organization: { slug } },
  });
  if (!membership) return undefined;
  const load = await prisma.load.findUnique({
    where: {
      organizationId_id: { organizationId: membership.organizationId, id },
    },
    include: {
      customer: true,
      stops: { orderBy: { sequence: "asc" } },
      statusHistory: true,
      approvedRevision: true,
    },
  });
  if (!load) return undefined;
  const loadAudits = await prisma.auditEvent.findMany({
    where: {
      organizationId: membership.organizationId,
      OR: [
        { entityType: "Load", entityId: id },
        {
          correlationId: {
            in: (
              await prisma.auditEvent.findMany({
                where: {
                  organizationId: membership.organizationId,
                  entityType: "Load",
                  entityId: id,
                },
                select: { correlationId: true },
              })
            ).map((event) => event.correlationId),
          },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  return { ...load, audits: loadAudits };
}

import Link from "next/link";
import {
  EnvironmentChip,
  EmptyState,
  InactiveState,
  StatusBadge,
} from "./atlas-primitives";
import { money, shortDate, relativeTime } from "@/lib/atlas-view-models";

export type StagingLoadOperationsView = {
  id: string;
  number: string;
  status: string;
  customer: string;
  commodity: string;
  weight: number;
  equipment: string;
  owner: string;
  nextAction: string;
  pickup: Date;
  delivery: Date;
  stops: Array<{
    id: string;
    type: string;
    sequence: number;
    facility: string;
    city: string;
    state: string;
    postalCode: string;
    start: Date | null;
    end: Date | null;
    confirmed: Date | null;
    instructions: string | null;
  }>;
  candidates: Array<{
    id: string;
    name: string;
    status: string;
    authority: boolean;
    insurance: boolean;
    cost?: number;
    reason?: string;
  }>;
  driver?: {
    name: string;
    phone?: string;
    dispatcher: string;
    dispatcherPhone?: string;
    tractor?: string;
    trailer?: string;
  };
  tracking: Array<{
    id: string;
    status: string;
    location?: string;
    occurredAt: Date;
    notes?: string;
  }>;
  communications: Array<{
    id: string;
    channel: string;
    party: string;
    direction: string;
    summary: string;
    occurredAt: Date;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    assignee: string;
    dueAt: Date | null;
  }>;
  audits: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: Date;
  }>;
  quotes: Array<{
    id: string;
    status: string;
    amount: number;
    currency: string;
    assumptions?: string;
  }>;
  canViewCommercials: boolean;
};

export function StagingLoadOperations({
  slug,
  load,
}: {
  slug: string;
  load: StagingLoadOperationsView;
}) {
  const origin = load.stops[0];
  const destination = load.stops.at(-1);
  const selected = load.candidates.find(
    (candidate) => candidate.status === "SELECTED",
  );
  const tabs = [
    "overview",
    "tracking",
    "stops",
    "carrier",
    "contacts",
    "communications",
    "documents",
    "timeline",
    "audit",
    ...(load.canViewCommercials ? ["financials", "pricing", "sourcing"] : []),
  ];
  return (
    <>
      <div className="breadcrumb">
        <Link href={`/org/${slug}`}>Command center</Link>
        <span>/</span>
        <Link href={`/org/${slug}/loads`}>Loads</Link>
        <span>/</span>
        <strong>{load.number}</strong>
      </div>
      <header className="operations-load-header">
        <div>
          <div className="title-line">
            <p className="overline">Persistent load operations</p>
            <StatusBadge label={load.status} tone="blue" />
            <EnvironmentChip mode="staging" />
          </div>
          <h1>{load.number}</h1>
          <p>
            {load.customer} · {load.commodity} · {load.weight.toLocaleString()}{" "}
            lb · {load.equipment}
          </p>
        </div>
        <div className="header-health">
          <span>
            <small>Owner</small>
            <b>{load.owner}</b>
          </span>
          <span>
            <small>Next action</small>
            <b>{load.nextAction}</b>
          </span>
        </div>
      </header>
      <nav className="operations-tabs" aria-label="Load operations sections">
        {tabs.map((tab, index) => (
          <a className={index === 0 ? "active" : ""} href={`#${tab}`} key={tab}>
            {tab[0].toUpperCase() + tab.slice(1)}
          </a>
        ))}
      </nav>
      <section className="ops-overview-grid" id="overview">
        <article className="panel route-card">
          <div className="panel-heading">
            <div>
              <p className="overline">Route overview</p>
              <h2>
                {origin
                  ? `${origin.city}, ${origin.state}`
                  : "Origin unavailable"}{" "}
                →{" "}
                {destination
                  ? `${destination.city}, ${destination.state}`
                  : "Destination unavailable"}
              </h2>
            </div>
          </div>
          <div className="route-vitals">
            <span>
              <small>Pickup</small>
              <b>{shortDate(load.pickup)}</b>
            </span>
            <span>
              <small>Delivery</small>
              <b>{shortDate(load.delivery)}</b>
            </span>
            <span>
              <small>Carrier</small>
              <b>{selected?.name ?? "Not selected"}</b>
            </span>
            <span>
              <small>Driver</small>
              <b>{load.driver?.name ?? "Not assigned"}</b>
            </span>
          </div>
        </article>
        <aside className="panel next-best-action">
          <p className="overline">Operator handoff</p>
          <h2>{load.nextAction}</h2>
          <p>
            All changes remain role-checked, tenant-scoped, and audit logged
            through the staging operations controls.
          </p>
          <Link className="button button-primary" href={`/org/${slug}/staging`}>
            Open operations controls
          </Link>
        </aside>
      </section>
      <OperationsSection
        id="tracking"
        title="Tracking"
        eyebrow="Manual visibility"
      >
        {load.tracking.length ? (
          <div className="timeline-list">
            {load.tracking.map((item) => (
              <div className="timeline-row" key={item.id}>
                <span className="activity-icon blue">◇</span>
                <p>
                  <b>{item.status}</b>
                  <small>
                    {item.location ?? "No location"} ·{" "}
                    {item.notes ?? "No notes"}
                  </small>
                </p>
                <time>{relativeTime(item.occurredAt)}</time>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No tracking updates"
            body="Manual milestones recorded for this load will appear here. No GPS provider is connected."
          />
        )}
      </OperationsSection>
      <OperationsSection
        id="stops"
        title={`Stops · ${load.stops.length}`}
        eyebrow="Appointments"
      >
        <div className="two-stop-detail">
          {load.stops.map((stop) => (
            <article className="stop-detail-card" key={stop.id}>
              <span className="stop-sequence">{stop.sequence}</span>
              <div>
                <StatusBadge label={stop.type} tone="slate" />
                <h3>{stop.facility}</h3>
                <p>
                  {stop.city}, {stop.state} {stop.postalCode}
                </p>
                <small>
                  {stop.start
                    ? `${shortDate(stop.start)}${stop.end ? ` – ${shortDate(stop.end)}` : ""}`
                    : "Appointment not scheduled"}{" "}
                  · {stop.confirmed ? "Confirmed" : "Not confirmed"}
                </small>
                {stop.instructions && <p>{stop.instructions}</p>}
              </div>
            </article>
          ))}
        </div>
      </OperationsSection>
      <OperationsSection
        id="carrier"
        title="Carrier"
        eyebrow="Selection evidence"
      >
        {selected ? (
          <div className="carrier-score-grid">
            <span>
              <small>Selected carrier</small>
              <b>{selected.name}</b>
            </span>
            <span>
              <small>Authority</small>
              <b>{selected.authority ? "Confirmed" : "Unconfirmed"}</b>
            </span>
            <span>
              <small>Insurance</small>
              <b>{selected.insurance ? "Confirmed" : "Unconfirmed"}</b>
            </span>
            <span>
              <small>Recorded cost</small>
              <b>
                {load.canViewCommercials ? money(selected.cost) : "Restricted"}
              </b>
            </span>
          </div>
        ) : (
          <EmptyState
            title="No carrier selected"
            body="Eligible carrier candidates can be reviewed and selected from staging operations controls."
          />
        )}
      </OperationsSection>
      <OperationsSection
        id="contacts"
        title="Contacts"
        eyebrow="Sensitive operational data"
      >
        {load.driver ? (
          <div className="profile-grid">
            <span>
              <small>Driver</small>
              <b>{load.driver.name}</b>
            </span>
            <span>
              <small>Driver phone</small>
              <b>{maskPhone(load.driver.phone)}</b>
            </span>
            <span>
              <small>Dispatcher</small>
              <b>{load.driver.dispatcher}</b>
            </span>
            <span>
              <small>Dispatcher phone</small>
              <b>{maskPhone(load.driver.dispatcherPhone)}</b>
            </span>
            <span>
              <small>Tractor / trailer</small>
              <b>
                {load.driver.tractor ?? "—"} / {load.driver.trailer ?? "—"}
              </b>
            </span>
          </div>
        ) : (
          <EmptyState
            title="No driver assigned"
            body="Driver and dispatcher contacts remain unavailable until a carrier and driver are assigned."
          />
        )}
        <p className="privacy-note">
          Contact values are masked on this read-only surface. Authorized reveal
          is not active in this milestone.
        </p>
      </OperationsSection>
      <OperationsSection
        id="communications"
        title={`Communications · ${load.communications.length}`}
        eyebrow="Recorded timeline"
      >
        {load.communications.length ? (
          <div className="communication-timeline">
            {load.communications.map((item) => (
              <div className="communication-entry" key={item.id}>
                <StatusBadge label={item.channel} tone="violet" />
                <p>
                  <b>
                    {item.party} · {item.direction}
                  </b>
                  <small>{item.summary}</small>
                </p>
                <time>{relativeTime(item.occurredAt)}</time>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No communications logged"
            body="Persisted calls, emails, and SMS summaries will appear here."
          />
        )}
      </OperationsSection>
      <OperationsSection id="documents" title="Documents" eyebrow="Paperwork">
        <InactiveState
          title="Document storage is not active"
          body="Uploads, document classification, and verification are intentionally unavailable in staging."
        />
      </OperationsSection>
      <OperationsSection
        id="timeline"
        title="Tasks and timeline"
        eyebrow="Execution follow-up"
      >
        {load.tasks.length ? (
          <div className="simple-directory">
            {load.tasks.map((task) => (
              <div className="directory-row" key={task.id}>
                <b>{task.title}</b>
                <span>{task.assignee}</span>
                <StatusBadge
                  label={task.status}
                  tone={task.status === "OPEN" ? "amber" : "green"}
                />
                <span>
                  {task.dueAt ? shortDate(task.dueAt) : "No due date"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No tasks on this load"
            body="Assigned follow-up tasks will appear here."
          />
        )}
      </OperationsSection>
      <OperationsSection
        id="audit"
        title={`Audit · ${load.audits.length}`}
        eyebrow="Immutable accountability"
      >
        <div className="audit-list">
          {load.audits.map((event) => (
            <div className="audit-row" key={event.id}>
              <time>{relativeTime(event.createdAt)}</time>
              <span className="activity-icon green">✓</span>
              <p>
                <b>{event.action}</b>
                <small>{event.entityType}</small>
              </p>
            </div>
          ))}
        </div>
      </OperationsSection>
      {load.canViewCommercials && (
        <>
          <OperationsSection
            id="financials"
            title="Financials"
            eyebrow="Commercial visibility"
          >
            <div className="finance-lines">
              <span>
                <small>Customer quote</small>
                <b>
                  {money(
                    load.quotes.find((quote) => quote.status === "ACCEPTED")
                      ?.amount ?? load.quotes.at(-1)?.amount,
                  )}
                </b>
              </span>
              <span>
                <small>Selected carrier cost</small>
                <b>{money(selected?.cost)}</b>
              </span>
            </div>
          </OperationsSection>
          <OperationsSection
            id="pricing"
            title={`Pricing · ${load.quotes.length}`}
            eyebrow="Quote history"
          >
            {load.quotes.length ? (
              <div className="simple-directory">
                {load.quotes.map((quote) => (
                  <div className="directory-row" key={quote.id}>
                    <b>{money(quote.amount)}</b>
                    <StatusBadge label={quote.status} tone="blue" />
                    <span>{quote.currency}</span>
                    <span>{quote.assumptions ?? "No assumptions"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No quote recorded"
                body="Human-created quotes will appear here after review."
              />
            )}
          </OperationsSection>
          <OperationsSection
            id="sourcing"
            title={`Sourcing · ${load.candidates.length}`}
            eyebrow="Carrier candidates"
          >
            {load.candidates.length ? (
              <div className="simple-directory">
                {load.candidates.map((candidate) => (
                  <div className="directory-row" key={candidate.id}>
                    <b>{candidate.name}</b>
                    <StatusBadge
                      label={candidate.status}
                      tone={candidate.status === "BLOCKED" ? "red" : "green"}
                    />
                    <span>
                      {candidate.authority
                        ? "Authority confirmed"
                        : "Authority unconfirmed"}
                    </span>
                    <span>
                      {candidate.insurance
                        ? "Insurance confirmed"
                        : "Insurance unconfirmed"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No candidates entered"
                body="Carrier sourcing records will appear here."
              />
            )}
          </OperationsSection>
        </>
      )}
    </>
  );
}

function OperationsSection({
  id,
  title,
  eyebrow,
  children,
}: {
  id: string;
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel operations-section" id={id}>
      <div className="panel-heading">
        <div>
          <p className="overline">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}
function maskPhone(phone?: string) {
  if (!phone) return "Not recorded";
  const digits = phone.replace(/\D/g, "");
  return `•••-•••-${digits.slice(-4)}`;
}

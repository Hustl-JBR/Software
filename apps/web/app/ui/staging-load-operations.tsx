import Link from "next/link";
import {
  EnvironmentChip,
  EmptyState,
  InactiveState,
  StatusBadge,
} from "./atlas-primitives";
import { money, shortDate, relativeTime } from "@/lib/atlas-view-models";
import { formatUsdFromCents } from "@/lib/currency";
import { humanizeAuditActivity, humanizeCode } from "@/lib/activity-language";
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
  recordDriver,
  selectCarrier,
  updateOwnership,
  calculateRoute,
  attachStopFacility,
} from "@/app/org/[slug]/staging/actions";
import { randomUUID } from "node:crypto";
import { ErrorAlert } from "./error-alert";
import { RouteMap } from "./route-map";
import { formatInFacilityTimeZone } from "@atlas/domain/timezone";

export type StagingLoadOperationsView = {
  id: string;
  requestId: string;
  currentUserId: string;
  number: string;
  status: string;
  customer: string;
  commodity: string;
  weight: number;
  equipment: string;
  owner: string;
  nextAction: string;
  members: Array<{ id: string; name: string }>;
  facilities: Array<{ id: string; name: string; city: string; state: string }>;
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
    latitude: number | null;
    longitude: number | null;
    timeZone: string | null;
  }>;
  route?: {
    distanceMeters: number;
    durationSeconds: number;
    encodedPolyline?: string;
    warning: string;
    provider: string;
    calculatedAt: Date;
  };
  routeProviderAvailable: boolean;
  mapBrowserKey?: string;
  candidates: Array<{
    id: string;
    name: string;
    status: string;
    authority: boolean;
    insurance: boolean;
    cost?: number;
    reason?: string;
    coverage?: number;
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
    createdById: string;
  }>;
  canViewCommercials: boolean;
  canManageLoad: boolean;
  canManageQuotes: boolean;
  canApprove: boolean;
};

export function StagingLoadOperations({
  slug,
  load,
  saved,
  error,
}: {
  slug: string;
  load: StagingLoadOperationsView;
  saved?: string;
  error?: string;
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
    "tasks",
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
            <p className="overline">Load operations</p>
            <StatusBadge label={humanizeCode(load.status)} tone="blue" />
            <EnvironmentChip mode="staging" />
          </div>
          <h1>{load.number}</h1>
          <p>
            {load.customer} · {load.commodity} · {load.weight.toLocaleString()}{" "}
            lb · {humanizeCode(load.equipment)}
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
      {saved && (
        <div className="alert success">
          Saved and added to the record history.
        </div>
      )}
      <ErrorAlert code={error} />
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
          <RouteMap
            apiKey={load.mapBrowserKey}
            stops={load.stops.flatMap((stop) =>
              stop.latitude === null || stop.longitude === null
                ? []
                : [{ lat: stop.latitude, lng: stop.longitude }],
            )}
            encodedPolyline={load.route?.encodedPolyline}
          />
          <div className="route-disclaimer">
            <b>General road estimate</b>
            <span>
              {load.route
                ? `${Math.round(load.route.distanceMeters / 1609.344).toLocaleString()} mi · ${Math.round(load.route.durationSeconds / 3600)} hr · ${load.route.provider}`
                : "No route estimate has been calculated."}
            </span>
            <small>
              {load.route?.warning ??
                "Not truck-legal or commercial vehicle routing. Do not use for clearance, weight, hazmat, or legal-road decisions."}
            </small>
          </div>
          {load.canManageLoad && load.routeProviderAvailable && (
            <form action={calculateRoute} className="record-action-form">
              <HiddenFields slug={slug} loadId={load.id} />
              <input type="hidden" name="idempotencyKey" value={randomUUID()} />
              <button className="button button-secondary">
                Calculate general road estimate
              </button>
            </form>
          )}
          {!load.routeProviderAvailable && (
            <InactiveState
              title="Route provider not configured"
              body="Facility and stop workflows remain usable. Add approved server credentials to enable estimates."
            />
          )}
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
            Current owner: {load.owner}. Backup owner is not configured and is
            listed as a readiness blocker.
          </p>
          {load.canManageLoad && (
            <form className="record-action-form" action={updateOwnership}>
              <HiddenFields slug={slug} loadId={load.id} />
              <label>
                Owner
                <select name="primaryOwnerId" defaultValue="" required>
                  <option value="">Select owner</option>
                  {load.members.map((member) => (
                    <option value={member.id} key={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Next action
                <input
                  name="nextAction"
                  defaultValue={load.nextAction}
                  required
                />
              </label>
              <button className="button button-primary">
                Update ownership
              </button>
            </form>
          )}
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
                  <b>{humanizeCode(item.status)}</b>
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
        {load.canManageLoad && (
          <form
            className="record-action-form inline-record-form"
            action={addTracking}
          >
            <HiddenFields slug={slug} loadId={load.id} />
            <label>
              Update type
              <select name="status" required>
                <option value="MANUAL_CHECK_CALL">Manual check call</option>
                <option value="LOCATION_REPORTED">Location reported</option>
                <option value="NO_UPDATE">No update available</option>
              </select>
            </label>
            <label>
              Reported location
              <input name="location" />
            </label>
            <label>
              Occurred at
              <input
                name="occurredAt"
                type="datetime-local"
                defaultValue={nowLocal()}
                required
              />
            </label>
            <label>
              Evidence or note
              <textarea name="notes" />
            </label>
            <button className="button button-secondary">
              Record tracking update
            </button>
            <small>
              Physical milestones are blocked while this load remains Draft.
            </small>
          </form>
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
                <StatusBadge label={humanizeCode(stop.type)} tone="slate" />
                <h3>{stop.facility}</h3>
                <p>
                  {stop.city}, {stop.state} {stop.postalCode}
                </p>
                <small>
                  {stop.start
                    ? `${stop.timeZone ? formatInFacilityTimeZone(stop.start, stop.timeZone) : shortDate(stop.start)}${stop.end ? ` – ${stop.timeZone ? formatInFacilityTimeZone(stop.end, stop.timeZone) : shortDate(stop.end)}` : ""}`
                    : "Appointment not scheduled"}{" "}
                  · {stop.confirmed ? "Confirmed" : "Not confirmed"}
                </small>
                {stop.instructions && <p>{stop.instructions}</p>}
                {load.canManageLoad && load.facilities.length > 0 && (
                  <form
                    action={attachStopFacility}
                    className="record-action-form"
                  >
                    <HiddenFields slug={slug} loadId={load.id} />
                    <input type="hidden" name="stopId" value={stop.id} />
                    <label>
                      Reusable facility
                      <select name="facilityId" defaultValue="" required>
                        <option value="">Select facility</option>
                        {load.facilities.map((facility) => (
                          <option value={facility.id} key={facility.id}>
                            {facility.name} — {facility.city}, {facility.state}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="button button-ghost">
                      Use facility snapshot
                    </button>
                  </form>
                )}
                {!stop.confirmed && load.canManageLoad && (
                  <form action={confirmStop}>
                    <HiddenFields slug={slug} loadId={load.id} />
                    <input type="hidden" name="stopId" value={stop.id} />
                    <button className="button button-secondary">
                      Confirm appointment
                    </button>
                  </form>
                )}
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
            body="Add and review eligible carrier options in the Sourcing section below."
          />
        )}
        {selected && !load.driver && load.canManageLoad && (
          <form
            className="record-action-form inline-record-form"
            action={recordDriver}
          >
            <HiddenFields slug={slug} loadId={load.id} />
            <input
              type="hidden"
              name="carrierCandidateId"
              value={selected.id}
            />
            <label>
              Driver name
              <input name="driverName" required />
            </label>
            <label>
              Driver phone
              <input name="driverPhone" />
            </label>
            <label>
              Dispatcher
              <input name="dispatcherName" required />
            </label>
            <label>
              Dispatcher phone
              <input name="dispatcherPhone" />
            </label>
            <label>
              Tractor
              <input name="tractorNumber" />
            </label>
            <label>
              Trailer
              <input name="trailerNumber" />
            </label>
            <button className="button button-secondary">
              Record carrier assignment
            </button>
          </form>
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
                <StatusBadge label={humanizeCode(item.channel)} tone="violet" />
                <p>
                  <b>
                    {item.party} · {humanizeCode(item.direction)}
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
        {load.canManageLoad && (
          <form
            className="record-action-form inline-record-form"
            action={addCommunication}
          >
            <HiddenFields slug={slug} loadId={load.id} />
            <label>
              Channel
              <select name="channel">
                <option value="PHONE">Phone</option>
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
                <option value="INTERNAL_NOTE">Internal note</option>
              </select>
            </label>
            <label>
              Party
              <select name="partyType">
                <option value="CUSTOMER">Customer</option>
                <option value="CARRIER">Carrier</option>
                <option value="DRIVER">Driver</option>
              </select>
            </label>
            <label>
              Contact name
              <input name="partyName" required />
            </label>
            <label>
              Direction
              <select name="direction">
                <option value="OUTBOUND">Outbound</option>
                <option value="INBOUND">Inbound</option>
              </select>
            </label>
            <label>
              Occurred at
              <input
                name="occurredAt"
                type="datetime-local"
                defaultValue={nowLocal()}
                required
              />
            </label>
            <label>
              Summary
              <textarea name="summary" required />
            </label>
            <button className="button button-secondary">
              Record communication
            </button>
          </form>
        )}
      </OperationsSection>
      <OperationsSection id="documents" title="Documents" eyebrow="Paperwork">
        <InactiveState
          title="Document storage is not active"
          body="Uploads, document classification, and verification are intentionally unavailable in staging."
        />
      </OperationsSection>
      <OperationsSection id="tasks" title="Tasks" eyebrow="Execution follow-up">
        {load.tasks.length ? (
          <div className="simple-directory">
            {load.tasks.map((task) => (
              <div className="directory-row" key={task.id}>
                <b>{task.title}</b>
                <span>{task.assignee}</span>
                <StatusBadge
                  label={humanizeCode(task.status)}
                  tone={task.status === "OPEN" ? "amber" : "green"}
                />
                <span>
                  {task.dueAt ? shortDate(task.dueAt) : "No due date"}
                </span>
                {task.status === "OPEN" && load.canManageLoad && (
                  <form action={completeTask}>
                    <HiddenFields slug={slug} loadId={load.id} />
                    <input type="hidden" name="taskId" value={task.id} />
                    <button className="button button-ghost">Complete</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No tasks on this load"
            body="Assigned follow-up tasks will appear here."
          />
        )}
        {load.canManageLoad && (
          <form
            className="record-action-form inline-record-form"
            action={createTask}
          >
            <HiddenFields slug={slug} loadId={load.id} />
            <label>
              Task
              <input name="title" required />
            </label>
            <label>
              Owner
              <select name="assigneeId" required>
                <option value="">Select owner</option>
                {load.members.map((member) => (
                  <option value={member.id} key={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Due date
              <input name="dueAt" type="datetime-local" />
            </label>
            <button className="button button-secondary">Create task</button>
          </form>
        )}
      </OperationsSection>
      <OperationsSection
        id="timeline"
        title="Timeline"
        eyebrow="Operational history"
      >
        <div className="timeline-list">
          {load.audits.map((event) => (
            <div className="timeline-row" key={`timeline-${event.id}`}>
              <span className="activity-icon violet">✓</span>
              <p>
                <b>
                  {humanizeAuditActivity({
                    action: event.action,
                    subject: load.number,
                  })}
                </b>
                <small>{relativeTime(event.createdAt)}</small>
              </p>
            </div>
          ))}
        </div>
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
                <small>{humanizeCode(event.entityType)}</small>
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
                    <StatusBadge
                      label={humanizeCode(quote.status)}
                      tone="blue"
                    />
                    <span>{quote.currency}</span>
                    <span>{quote.assumptions ?? "No assumptions"}</span>
                    {quote.status === "DRAFT" &&
                      quote.createdById !== load.currentUserId &&
                      load.canApprove && (
                        <form action={approveQuote}>
                          <HiddenFields slug={slug} loadId={load.id} />
                          <input
                            type="hidden"
                            name="quoteId"
                            value={quote.id}
                          />
                          <input
                            type="hidden"
                            name="idempotencyKey"
                            value={randomUUID()}
                          />
                          <button className="button button-secondary">
                            Approve quote
                          </button>
                        </form>
                      )}
                    {quote.status === "APPROVED" && load.canManageQuotes && (
                      <form className="inline-action-form" action={acceptQuote}>
                        <HiddenFields slug={slug} loadId={load.id} />
                        <input type="hidden" name="quoteId" value={quote.id} />
                        <input
                          type="hidden"
                          name="idempotencyKey"
                          value={randomUUID()}
                        />
                        <input
                          name="evidence"
                          placeholder="Customer acceptance evidence"
                          required
                        />
                        <button className="button button-secondary">
                          Record decision
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No quote recorded"
                body="Human-created quotes will appear here after review."
              />
            )}
            {load.canManageQuotes && (
              <form
                className="record-action-form inline-record-form"
                action={createQuote}
              >
                <HiddenFields slug={slug} loadId={load.id} />
                <input
                  type="hidden"
                  name="shipmentRequestId"
                  value={load.requestId}
                />
                <label>
                  Customer quote
                  <input
                    name="amount"
                    inputMode="decimal"
                    placeholder="$2,850.00"
                    required
                  />
                </label>
                <label>
                  Assumptions
                  <textarea name="assumptions" />
                </label>
                <button className="button button-secondary">
                  Create quote
                </button>
              </form>
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
                      label={humanizeCode(candidate.status)}
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
                    <span>{formatUsdFromCents(candidate.coverage)}</span>
                    {candidate.status === "QUALIFIED" && load.canApprove && (
                      <form action={selectCarrier}>
                        <HiddenFields slug={slug} loadId={load.id} />
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
                        <button className="button button-secondary">
                          Select carrier
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No candidates entered"
                body="Carrier sourcing records will appear here."
              />
            )}
            {load.canManageLoad && (
              <form
                className="record-action-form inline-record-form"
                action={addCandidate}
              >
                <HiddenFields slug={slug} loadId={load.id} />
                <label>
                  Carrier business
                  <input name="carrierName" required />
                </label>
                <label className="check-card">
                  <input name="authorityConfirmed" type="checkbox" />
                  <span>Authority manually confirmed</span>
                </label>
                <label className="check-card">
                  <input name="insuranceConfirmed" type="checkbox" />
                  <span>Insurance manually confirmed</span>
                </label>
                <label>
                  Cargo coverage
                  <input
                    name="cargoCoverage"
                    inputMode="decimal"
                    placeholder="$100,000.00"
                  />
                </label>
                <label>
                  Offered rate
                  <input
                    name="quotedCost"
                    inputMode="decimal"
                    placeholder="$2,180.00"
                  />
                </label>
                <button className="button button-secondary">
                  Add carrier option
                </button>
              </form>
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

function HiddenFields({ slug, loadId }: { slug: string; loadId: string }) {
  return (
    <>
      <input type="hidden" name="organizationSlug" value={slug} />
      <input type="hidden" name="loadId" value={loadId} />
      <input
        type="hidden"
        name="returnPath"
        value={`/org/${slug}/loads/${loadId}`}
      />
    </>
  );
}

function nowLocal() {
  return new Date().toISOString().slice(0, 16);
}

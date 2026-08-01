"use client";

import { useState } from "react";
import { useOperationsDemo } from "./operations-demo-provider";

const tabs = [
  "Overview",
  "Tracking",
  "Stops",
  "Carrier",
  "Communications",
  "Documents",
  "Financials",
  "Timeline",
  "Audit",
  "Pricing",
  "Sourcing",
] as const;
type Tab = (typeof tabs)[number];

export function DemoLoadOperations({
  loadId,
  slug,
}: {
  loadId: string;
  slug: string;
}) {
  const { state } = useOperationsDemo();
  const [tab, setTab] = useState<Tab>("Overview");
  const load = state.loads.find((item) => item.id === loadId);
  if (!load)
    return (
      <div className="panel empty-state">
        <h2>Demo load not found</h2>
        <a href={`/org/${slug}/loads`}>Return to loads</a>
      </div>
    );
  const gp = load.revenue - load.carrierCost;
  const margin = load.revenue ? (gp / load.revenue) * 100 : 0;
  return (
    <>
      <div className="breadcrumb">
        <a href={`/org/${slug}`}>Command center</a>
        <span>/</span>
        <a href={`/org/${slug}/loads`}>Loads</a>
        <span>/</span>
        <strong>{load.number}</strong>
      </div>
      <header className="operations-load-header">
        <div className="ops-load-title">
          <div className="title-line">
            <p className="overline">Active load operations</p>
            <span className={`status-pill ${tone(load.health)}`}>
              {load.status}
            </span>
            <span className="synthetic-chip">Synthetic operations</span>
          </div>
          <h1>{load.number}</h1>
          <p>
            {load.customer} <span>·</span> {load.origin} → {load.destination}
          </p>
        </div>
        <div className="header-health">
          <span>
            <small>Operational health</small>
            <b className={tone(load.health)}>
              <i />
              {load.health}
            </b>
          </span>
          <span>
            <small>Current ETA</small>
            <b>{load.eta}</b>
          </span>
          <span>
            <small>Tracking freshness</small>
            <b>{load.lastUpdate}</b>
          </span>
          <span>
            <small>Expected GP</small>
            <b>
              ${gp.toLocaleString()} · {margin.toFixed(1)}%
            </b>
          </span>
        </div>
      </header>
      <section className="next-action-banner">
        <span className="ai-orb">✦</span>
        <div>
          <p>Next required action</p>
          <b>{load.nextAction}</b>
        </div>
        <button
          onClick={() =>
            setTab(
              load.status === "Ready to quote"
                ? "Pricing"
                : load.status === "Sourcing carrier"
                  ? "Sourcing"
                  : "Tracking",
            )
          }
        >
          Open workspace →
        </button>
      </section>
      <nav className="operations-tabs" aria-label="Load operations tabs">
        {tabs.map((name) => (
          <button
            className={tab === name ? "active" : ""}
            key={name}
            onClick={() => setTab(name)}
          >
            {name}
            {name === "Communications" && (
              <b>
                {
                  state.communications.filter((item) => item.loadId === loadId)
                    .length
                }
              </b>
            )}
            {name === "Stops" && <b>2</b>}
          </button>
        ))}
      </nav>
      <div className="operations-tab-content">
        {tab === "Overview" && <Overview loadId={loadId} />}
        {tab === "Tracking" && <Tracking loadId={loadId} />}
        {tab === "Stops" && <Stops loadId={loadId} />}
        {tab === "Carrier" && <Carrier loadId={loadId} />}
        {tab === "Communications" && <Communications loadId={loadId} />}
        {tab === "Documents" && <Documents loadId={loadId} />}
        {tab === "Financials" && <Financials loadId={loadId} />}
        {tab === "Timeline" && <Timeline loadId={loadId} />}
        {tab === "Audit" && <Audit loadId={loadId} />}
        {tab === "Pricing" && <Pricing loadId={loadId} />}
        {tab === "Sourcing" && <Sourcing />}
      </div>
    </>
  );
}

function Overview({ loadId }: { loadId: string }) {
  const { state, draftUpdate } = useOperationsDemo();
  const load = state.loads.find((item) => item.id === loadId)!;
  const exceptions = state.exceptions.filter(
    (item) => item.loadId === loadId && item.status === "Open",
  );
  return (
    <div className="ops-overview-grid">
      <div className="ops-main-column">
        <section className="panel route-command-card">
          <div className="panel-heading">
            <div>
              <p className="overline">Current movement</p>
              <h2>
                {load.origin} → {load.destination}
              </h2>
            </div>
            <span className={`health-chip ${tone(load.health)}`}>
              {load.health}
            </span>
          </div>
          <RouteVisualization loadId={loadId} compact />
          <div className="route-vitals">
            <span>
              <small>Progress</small>
              <b>
                {load.progress}% ·{" "}
                {Math.round((load.miles * load.progress) / 100)} mi
              </b>
            </span>
            <span>
              <small>Remaining</small>
              <b>
                {Math.round((load.miles * (100 - load.progress)) / 100)} miles
              </b>
            </span>
            <span>
              <small>Current location</small>
              <b>{load.currentLocation}</b>
            </span>
            <span>
              <small>Next milestone</small>
              <b>{load.nextAction}</b>
            </span>
          </div>
        </section>
        <section className="panel ops-stops-summary">
          <div className="panel-heading">
            <div>
              <p className="overline">Stops & appointments</p>
              <h2>Execution plan</h2>
            </div>
          </div>
          <StopSummary
            number="1"
            type="Pickup"
            facility="Atlas Nashville Warehouse"
            address="1400 Freight Way · Nashville, TN 37210"
            window="Jul 31 · 08:00–10:00"
            status={load.progress > 10 ? "Departed · 10:18" : "Confirmed"}
          />
          <StopSummary
            number="2"
            type="Delivery"
            facility="Atlas Atlanta Distribution Center"
            address="6200 Fulton Industrial Blvd · Atlanta, GA 30336"
            window="Aug 1 · 09:00–11:00"
            status={load.progress === 100 ? "Completed" : "Scheduled"}
          />
        </section>
      </div>
      <aside className="ops-side-column">
        <section className="panel operator-brief">
          <div className="panel-heading">
            <div>
              <p className="overline violet">Atlas operator brief</p>
              <h2>What matters now</h2>
            </div>
            <span className="ai-orb">✦</span>
          </div>
          <div className="brief-score">
            <strong>{load.health === "Healthy" ? "LOW" : "HIGH"}</strong>
            <span>
              <b>Operational risk</b>
              <small>Based on synthetic demo signals</small>
            </span>
          </div>
          <p>
            {load.health === "Healthy"
              ? "The driver is moving and the ETA remains within the planned delivery window."
              : "A live exception is affecting ETA confidence and customer communication."}
          </p>
          <button
            className="button button-secondary full-button"
            onClick={() => draftUpdate(loadId)}
          >
            Draft customer update
          </button>
        </section>
        <Exceptions loadId={loadId} compact />
        {exceptions.length === 0 && (
          <section className="panel all-clear">
            <span>✓</span>
            <p>
              <b>No open exceptions</b>
              <small>
                Atlas is monitoring tracking, ETA, appointments, and documents.
              </small>
            </p>
          </section>
        )}
      </aside>
    </div>
  );
}

function Tracking({ loadId }: { loadId: string }) {
  const { state, simulate, draftUpdate } = useOperationsDemo();
  const load = state.loads.find((item) => item.id === loadId)!;
  return (
    <div className="tracking-layout">
      <section className="panel tracking-map-panel">
        <div className="panel-heading">
          <div>
            <p className="overline violet">Synthetic live tracking</p>
            <h2>Driver movement</h2>
            <p>
              Local route simulation · not connected to GPS, mapping, or traffic
              providers.
            </p>
          </div>
          <span
            className={`tracking-live ${load.tracking === "Live" ? "live" : ""}`}
          >
            <i />
            {load.tracking}
          </span>
        </div>
        <RouteVisualization loadId={loadId} />
        <div className="tracking-vitals">
          <span>
            <small>Current location</small>
            <b>{load.currentLocation}</b>
          </span>
          <span>
            <small>Miles traveled</small>
            <b>{Math.round((load.miles * load.progress) / 100)} mi</b>
          </span>
          <span>
            <small>Miles remaining</small>
            <b>{Math.round((load.miles * (100 - load.progress)) / 100)} mi</b>
          </span>
          <span>
            <small>Estimated arrival</small>
            <b className={load.etaStatus === "Late" ? "late-text" : ""}>
              {load.eta}
            </b>
          </span>
          <span>
            <small>Appointment</small>
            <b>Aug 1 · 09:00–11:00</b>
          </span>
          <span>
            <small>Last update</small>
            <b>{load.lastUpdate}</b>
          </span>
        </div>
      </section>
      <aside>
        <section className="panel simulation-controls">
          <div className="panel-heading">
            <div>
              <p className="overline">Demo controls</p>
              <h2>Simulate operations</h2>
            </div>
          </div>
          <div className="control-group">
            <p>Movement</p>
            <button onClick={() => simulate(loadId, "advance")}>
              Advance truck
            </button>
            <button onClick={() => simulate(loadId, "pause")}>
              Pause updates
            </button>
            <button onClick={() => simulate(loadId, "restore")}>
              Restore tracking
            </button>
          </div>
          <div className="control-group">
            <p>Exceptions</p>
            <button
              className="warning-control"
              onClick={() => simulate(loadId, "traffic")}
            >
              Add traffic delay
            </button>
            <button
              className="warning-control"
              onClick={() => simulate(loadId, "weather")}
            >
              Add weather delay
            </button>
            <button onClick={() => simulate(loadId, "stopped")}>
              Driver stopped
            </button>
          </div>
          <div className="control-group">
            <p>Milestones</p>
            <button onClick={() => simulate(loadId, "arrive-pickup")}>
              Arrive at pickup
            </button>
            <button onClick={() => simulate(loadId, "depart-pickup")}>
              Depart pickup
            </button>
            <button onClick={() => simulate(loadId, "arrive-delivery")}>
              Arrive at delivery
            </button>
            <button onClick={() => simulate(loadId, "complete")}>
              Complete delivery
            </button>
          </div>
          {load.etaStatus === "Late" && (
            <button
              className="button button-primary full-button"
              onClick={() => draftUpdate(loadId, "Customer delay notification")}
            >
              Draft delay update
            </button>
          )}
        </section>
        <Exceptions loadId={loadId} compact />
      </aside>
    </div>
  );
}

function RouteVisualization({
  loadId,
  compact = false,
}: {
  loadId: string;
  compact?: boolean;
}) {
  const { state } = useOperationsDemo();
  const load = state.loads.find((item) => item.id === loadId)!;
  return (
    <div className={`synthetic-route-map ${compact ? "compact" : ""}`}>
      <div className="map-grid" />
      <div className="planned-route" />
      <div
        className="completed-route"
        style={{ width: `${Math.max(5, load.progress * 0.62)}%` }}
      />
      <span className="tracking-pin origin">
        <b>1</b>
        <small>{load.origin.split(",")[0]}</small>
      </span>
      <span className="tracking-pin destination">
        <b>2</b>
        <small>{load.destination.split(",")[0]}</small>
      </span>
      <span
        className="moving-truck"
        style={{ left: `${18 + load.progress * 0.62}%` }}
      >
        ▰<small>{load.progress}%</small>
      </span>
      <span className="synthetic-watermark">SYNTHETIC ROUTE</span>
    </div>
  );
}

function Stops({ loadId }: { loadId: string }) {
  const { simulate } = useOperationsDemo();
  return (
    <div className="two-stop-detail">
      <StopDetail
        number="1"
        type="Pickup"
        facility="Atlas Nashville Warehouse"
        address="1400 Freight Way, Nashville, TN 37210"
        contact="Maria Lopez · (615) 555-0142"
        window="Jul 31 · 08:00–10:00"
        instructions="Check in at Gate 4. Driver must reference PO HW-88341."
        documents="BOL, pallet count"
        actions={[
          "Confirm appointment",
          "Mark arrived",
          "Mark loading",
          "Mark departed",
        ]}
        onAction={(name) =>
          simulate(
            loadId,
            name === "Mark arrived"
              ? "arrive-pickup"
              : name === "Mark departed"
                ? "depart-pickup"
                : "advance",
          )
        }
      />
      <StopDetail
        number="2"
        type="Delivery"
        facility="Atlas Atlanta Distribution Center"
        address="6200 Fulton Industrial Blvd, Atlanta, GA 30336"
        contact="Receiving desk · (404) 555-0198"
        window="Aug 1 · 09:00–11:00"
        instructions="Use south entrance. Lumper service available on arrival."
        documents="Signed POD, delivery receipt"
        actions={[
          "Confirm appointment",
          "Reschedule",
          "Mark arrived",
          "Add facility note",
        ]}
        onAction={(name) =>
          simulate(
            loadId,
            name === "Mark arrived" ? "arrive-delivery" : "advance",
          )
        }
      />
    </div>
  );
}

function StopDetail({
  number,
  type,
  facility,
  address,
  contact,
  window,
  instructions,
  documents,
  actions,
  onAction,
}: {
  number: string;
  type: string;
  facility: string;
  address: string;
  contact: string;
  window: string;
  instructions: string;
  documents: string;
  actions: string[];
  onAction: (name: string) => void;
}) {
  return (
    <article className="panel detailed-stop">
      <div className="stop-card-top">
        <span className={`stop-number ${type.toLowerCase()}`}>{number}</span>
        <div>
          <p className="overline">{type}</p>
          <h2>{facility}</h2>
        </div>
        <span className="status-pill green">Confirmed</span>
      </div>
      <div className="stop-detail-grid">
        <span>
          <small>Full address</small>
          <b>{address}</b>
        </span>
        <span>
          <small>Contact</small>
          <b>{contact}</b>
        </span>
        <span>
          <small>Appointment</small>
          <b>{window}</b>
        </span>
        <span>
          <small>Arrival / departure</small>
          <b>Pending / Pending</b>
        </span>
        <span>
          <small>Loading status</small>
          <b>Not started</b>
        </span>
        <span>
          <small>Dwell / detention</small>
          <b>0 min / threshold 120 min</b>
        </span>
        <span>
          <small>References</small>
          <b>PO HW-88341 · REF 7726</b>
        </span>
        <span>
          <small>Required documents</small>
          <b>{documents}</b>
        </span>
      </div>
      <div className="facility-instructions">
        <small>Facility instructions</small>
        <p>{instructions}</p>
      </div>
      <div className="stop-actions">
        {actions.map((action) => (
          <button key={action} onClick={() => onAction(action)}>
            {action}
          </button>
        ))}
        <button>Add delay</button>
      </div>
    </article>
  );
}

function Carrier({ loadId }: { loadId: string }) {
  const { state } = useOperationsDemo();
  const load = state.loads.find((item) => item.id === loadId)!;
  return (
    <div className="carrier-detail-grid">
      <section className="panel carrier-profile">
        <div className="carrier-hero">
          <span>SF</span>
          <div>
            <p className="overline">Assigned carrier</p>
            <h2>{load.carrier}</h2>
            <p>MC-1048XX · DOT-38XX21</p>
          </div>
          <span className="verified-chip">✓ Authority active</span>
        </div>
        <div className="carrier-score-grid">
          <MetricValue label="Atlas fit" value="96 / 100" />
          <MetricValue label="On-time" value="97%" />
          <MetricValue label="Tracking compliance" value="99%" />
          <MetricValue label="Cancellation rate" value="1.2%" />
          <MetricValue label="Lane experience" value="18 loads" />
          <MetricValue label="Relationship" value="Preferred" />
        </div>
      </section>
      <section className="panel driver-card">
        <div className="panel-heading">
          <div>
            <p className="overline">Assigned driver</p>
            <h2>{load.driver}</h2>
          </div>
          <span className="tracking-live live">
            <i /> Tracking
          </span>
        </div>
        <div className="driver-avatar">LM</div>
        <dl>
          <div>
            <dt>Mobile</dt>
            <dd>(615) 555-0187</dd>
          </div>
          <div>
            <dt>Tractor</dt>
            <dd>Unit 742</dd>
          </div>
          <div>
            <dt>Trailer</dt>
            <dd>53′ Dry van · 88014</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>Driving · 6h 14m available</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function Communications({ loadId }: { loadId: string }) {
  const { state, draftUpdate } = useOperationsDemo();
  const items = state.communications.filter((item) => item.loadId === loadId);
  const drafts = [
    "Pickup confirmation",
    "Customer status update",
    "Delay notification",
    "Appointment request",
    "Tracking request",
    "Delivery confirmation",
    "Missing-document request",
  ];
  return (
    <div className="communications-layout">
      <section className="panel communication-feed">
        <div className="panel-heading">
          <div>
            <p className="overline">Unified record</p>
            <h2>Communications timeline</h2>
          </div>
          <span className="synthetic-chip">No messages are sent</span>
        </div>
        {items.map((item) => (
          <article
            className={`communication-item ${item.status === "Unsent draft" ? "draft" : ""}`}
            key={item.id}
          >
            <span className="communication-icon">
              {item.channel.includes("email")
                ? "✉"
                : item.channel.includes("text")
                  ? "▣"
                  : item.channel.includes("note")
                    ? "✎"
                    : "↗"}
            </span>
            <div>
              <p>
                <b>{item.title}</b>
                <span>{item.channel}</span>
              </p>
              <blockquote>{item.body}</blockquote>
              <small>
                {item.time} · {item.status}
              </small>
              {item.status === "Unsent draft" && (
                <div className="draft-actions">
                  <button>Review draft</button>
                  <button>Discard</button>
                  <span>Unsent — operator approval required</span>
                </div>
              )}
            </div>
          </article>
        ))}
      </section>
      <aside className="panel draft-generator">
        <div className="panel-heading">
          <div>
            <p className="overline violet">Atlas drafting</p>
            <h2>Generate an unsent draft</h2>
          </div>
          <span className="ai-orb">✦</span>
        </div>
        {drafts.map((name) => (
          <button key={name} onClick={() => draftUpdate(loadId, name)}>
            {name}
            <span>→</span>
          </button>
        ))}
      </aside>
    </div>
  );
}

function Documents({ loadId }: { loadId: string }) {
  return (
    <section className="panel documents-workspace">
      <div className="panel-heading">
        <div>
          <p className="overline">Document control</p>
          <h2>Load documents</h2>
        </div>
        <span className="synthetic-chip">Demo records</span>
      </div>
      <DocumentRow
        name="Rate confirmation"
        status="Verified"
        time="Jul 30 · 4:22 PM"
      />
      <DocumentRow
        name="Bill of lading"
        status="Received"
        time="Jul 31 · 10:20 AM"
      />
      <DocumentRow
        name="Proof of delivery"
        status="Required"
        time="Due after delivery"
      />
      <DocumentRow
        name="Carrier invoice"
        status={loadId === "atl-4834" ? "Mismatch" : "Pending"}
        time="Not received"
      />
    </section>
  );
}
function DocumentRow({
  name,
  status,
  time,
}: {
  name: string;
  status: string;
  time: string;
}) {
  return (
    <div className="document-row">
      <span>▤</span>
      <p>
        <b>{name}</b>
        <small>{time}</small>
      </p>
      <span
        className={`status-pill ${status === "Mismatch" ? "amber" : status === "Verified" || status === "Received" ? "green" : "slate"}`}
      >
        {status}
      </span>
      <button>View details</button>
    </div>
  );
}

function Financials({ loadId }: { loadId: string }) {
  const { state } = useOperationsDemo();
  const load = state.loads.find((item) => item.id === loadId)!;
  const mismatch = loadId === "atl-4834";
  const gp = load.revenue - load.carrierCost;
  return (
    <div className="financials-grid">
      <section className="panel financial-summary">
        <div className="panel-heading">
          <div>
            <p className="overline">Load economics</p>
            <h2>Financial summary</h2>
          </div>
          <span className="synthetic-chip">Synthetic values</span>
        </div>
        <div className="money-hero">
          <span>
            <small>Customer revenue</small>
            <strong>${load.revenue.toLocaleString()}</strong>
          </span>
          <i>−</i>
          <span>
            <small>Carrier cost</small>
            <strong>${load.carrierCost.toLocaleString()}</strong>
          </span>
          <i>=</i>
          <span className="profit">
            <small>Expected gross profit</small>
            <strong>${gp.toLocaleString()}</strong>
            <b>
              {load.revenue ? ((gp / load.revenue) * 100).toFixed(1) : "0.0"}%
              margin
            </b>
          </span>
        </div>
        <div className="finance-lines">
          <MetricValue label="Revenue accessorials" value="$0" />
          <MetricValue
            label="Carrier accessorials"
            value={mismatch ? "$185 disputed" : "$0"}
          />
          <MetricValue label="Customer invoice" value="Draft pending POD" />
          <MetricValue
            label="Carrier bill"
            value={mismatch ? "Mismatch" : "Not received"}
          />
          <MetricValue label="Customer terms" value="Net 30" />
          <MetricValue label="Carrier terms" value="Net 21" />
        </div>
      </section>
      {mismatch && (
        <section className="panel invoice-mismatch">
          <span>!</span>
          <div>
            <p className="overline">Reconciliation exception</p>
            <h2>Carrier invoice differs by $185</h2>
            <p>
              The carrier bill includes a detention charge that does not appear
              on the rate confirmation.
            </p>
            <div>
              <button>Review documents</button>
              <button>Request support</button>
              <button>Mark approved</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Timeline({ loadId }: { loadId: string }) {
  const { state } = useOperationsDemo();
  const events = state.timeline.filter((item) => item.loadId === loadId);
  return (
    <section className="panel operations-timeline">
      <div className="panel-heading">
        <div>
          <p className="overline">Operational history</p>
          <h2>Load timeline</h2>
        </div>
      </div>
      {events.map((event) => (
        <div className="ops-timeline-event" key={event.id}>
          <span className={event.tone}>
            {event.tone === "amber" ? "!" : event.tone === "violet" ? "✦" : "✓"}
          </span>
          <div>
            <h3>{event.title}</h3>
            <p>{event.detail}</p>
          </div>
          <time>{event.time}</time>
        </div>
      ))}
    </section>
  );
}
function Audit({ loadId }: { loadId: string }) {
  const { state } = useOperationsDemo();
  const events = state.timeline.filter((item) => item.loadId === loadId);
  return (
    <section className="panel audit-workspace">
      <div className="panel-heading">
        <div>
          <p className="overline">Immutable demo record</p>
          <h2>Audit trail</h2>
          <p>Human-readable actions with stable synthetic identifiers.</p>
        </div>
        <span className="immutable-chip">◈ Protected</span>
      </div>
      {events.map((event, index) => (
        <div className="audit-row" key={event.id}>
          <code>EVT-{String(index + 1).padStart(3, "0")}</code>
          <span>
            <b>{event.title}</b>
            <small>{event.detail}</small>
          </span>
          <span>Demo Approver</span>
          <time>{event.time}</time>
        </div>
      ))}
    </section>
  );
}

function Pricing({ loadId }: { loadId: string }) {
  const { state, updatePricing } = useOperationsDemo();
  const price =
    state.pricing.find((item) => item.loadId === loadId) ?? state.pricing[0];
  const gp = price.customerQuote - price.marketCost - price.riskBuffer;
  const margin = (gp / price.customerQuote) * 100;
  return (
    <div className="pricing-layout">
      <section className="panel price-recommendation">
        <div className="panel-heading">
          <div>
            <p className="overline violet">Atlas pricing concept</p>
            <h2>Recommended customer quote</h2>
            <p>
              Synthetic market values · not connected to DAT, Truckstop, or any
              marketplace.
            </p>
          </div>
          <span className="ai-orb">✦</span>
        </div>
        <div className="quote-hero">
          <small>Suggested quote</small>
          <strong>${price.customerQuote.toLocaleString()}</strong>
          <span>
            ${(price.customerQuote / 612).toFixed(2)} per mile · expires{" "}
            {price.expires}
          </span>
        </div>
        <div className="market-signals">
          <MetricValue label="Origin market" value="Balanced" />
          <MetricValue label="Destination market" value="Soft" />
          <MetricValue label="Capacity" value="Moderate" />
          <MetricValue label="Historical lane" value="38 demo moves" />
          <MetricValue label="Confidence" value={`${price.confidence}%`} />
        </div>
        <div className="pricing-explanation">
          <span>✦</span>
          <p>
            <b>Why Atlas recommends this rate</b>
            <small>
              Capacity is available near Birmingham, but the Jacksonville
              destination creates modest reload risk. The quote protects a 20%
              target margin with a synthetic $150 risk buffer.
            </small>
          </p>
        </div>
      </section>
      <section className="panel price-model">
        <div className="panel-heading">
          <div>
            <p className="overline">Scenario model</p>
            <h2>Adjust the economics</h2>
          </div>
        </div>
        <PriceInput
          label="Customer quote"
          value={price.customerQuote}
          onChange={(value) =>
            updatePricing(price.loadId, "customerQuote", value)
          }
        />
        <PriceInput
          label="Expected carrier cost"
          value={price.marketCost}
          onChange={(value) => updatePricing(price.loadId, "marketCost", value)}
        />
        <PriceInput
          label="Target margin"
          value={price.targetMargin}
          suffix="%"
          onChange={(value) =>
            updatePricing(price.loadId, "targetMargin", value)
          }
        />
        <PriceInput
          label="Risk buffer"
          value={price.riskBuffer}
          onChange={(value) => updatePricing(price.loadId, "riskBuffer", value)}
        />
        <div className="pricing-result">
          <span>
            <small>Expected gross profit</small>
            <strong>${gp.toLocaleString()}</strong>
          </span>
          <span>
            <small>Expected margin</small>
            <strong className={margin < price.targetMargin ? "late-text" : ""}>
              {margin.toFixed(1)}%
            </strong>
          </span>
          <span>
            <small>Minimum price</small>
            <strong>
              $
              {Math.ceil(
                (price.marketCost + price.riskBuffer) /
                  (1 - price.targetMargin / 100),
              ).toLocaleString()}
            </strong>
          </span>
        </div>
        <button className="button button-primary full-button">
          Approve synthetic quote
        </button>
      </section>
    </div>
  );
}
function PriceInput({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="price-input">
      <span>{label}</span>
      <div>
        {suffix ? "" : "$"}
        <input
          type="number"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix}
      </div>
    </label>
  );
}

function Sourcing() {
  const { state, updateCarrier } = useOperationsDemo();
  return (
    <section className="panel sourcing-workspace">
      <div className="panel-heading">
        <div>
          <p className="overline violet">Synthetic carrier sourcing</p>
          <h2>Compare carrier fit</h2>
          <p>No load board is connected and no carrier will be contacted.</p>
        </div>
        <div className="sourcing-funnel">
          <span>4 recommended</span>
          <span>1 interested</span>
          <span>1 countered</span>
        </div>
      </div>
      <div className="carrier-compare-head">
        <span>Carrier</span>
        <span>Proposed rate</span>
        <span>Service</span>
        <span>Compliance</span>
        <span>Lane history</span>
        <span>Atlas fit</span>
        <span>Stage / action</span>
      </div>
      {state.carriers.map((carrier) => (
        <div
          className={`carrier-compare-row ${carrier.stage === "Selected" ? "selected" : ""}`}
          key={carrier.id}
        >
          <span>
            <b>{carrier.name}</b>
            <small>
              {carrier.mc} · {carrier.dot}
              <br />
              {carrier.pickupDistance} mi from pickup
            </small>
          </span>
          <span>
            <strong>${carrier.rate.toLocaleString()}</strong>
            <small>${(carrier.rate / 612).toFixed(2)}/mi</small>
          </span>
          <span>
            <b>{carrier.onTime}% on time</b>
            <small>{carrier.cancellations}% cancel rate</small>
          </span>
          <span>
            <b>{carrier.insurance}</b>
            <small>
              {carrier.authority} authority · {carrier.tracking}% tracking
            </small>
          </span>
          <span>
            <b>{carrier.laneLoads} loads</b>
            <small>{carrier.relationship} relationship</small>
          </span>
          <span className="fit-score">
            <strong>{carrier.fit}</strong>
            <small>/ 100</small>
          </span>
          <span>
            <span
              className={`status-pill ${carrier.stage === "Recommended" || carrier.stage === "Selected" ? "green" : carrier.stage === "Countered" ? "amber" : "slate"}`}
            >
              {carrier.stage}
            </span>
            <div className="carrier-actions">
              <button
                onClick={() => updateCarrier(carrier.id, "Offer drafted")}
              >
                Draft offer
              </button>
              <button onClick={() => updateCarrier(carrier.id, "Countered")}>
                Record counter
              </button>
              <button onClick={() => updateCarrier(carrier.id, "Selected")}>
                Select
              </button>
            </div>
          </span>
        </div>
      ))}
    </section>
  );
}

function Exceptions({
  loadId,
  compact = false,
}: {
  loadId: string;
  compact?: boolean;
}) {
  const { state, resolveException, draftUpdate } = useOperationsDemo();
  const items = state.exceptions.filter(
    (item) => item.loadId === loadId && item.status === "Open",
  );
  if (!items.length) return null;
  return (
    <section
      className={`panel exception-panel ${compact ? "compact-exception" : ""}`}
    >
      <div className="panel-heading">
        <div>
          <p className="overline red-overline">Structured exception</p>
          <h2>Exception management</h2>
        </div>
        <span className="status-pill amber">{items.length} open</span>
      </div>
      {items.map((item) => (
        <article className="exception-card" key={item.id}>
          <div className="exception-title">
            <span>!</span>
            <div>
              <h3>{item.type}</h3>
              <p>
                {item.source} · {item.detected}
              </p>
            </div>
            <span className={`severity-label ${item.severity.toLowerCase()}`}>
              {item.severity}
            </span>
          </div>
          <dl>
            <div>
              <dt>Evidence</dt>
              <dd>{item.evidence}</dd>
            </div>
            <div>
              <dt>Operational impact</dt>
              <dd>{item.impact}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>{item.owner}</dd>
            </div>
            <div>
              <dt>Communication</dt>
              <dd>{item.communication}</dd>
            </div>
          </dl>
          <div className="playbook">
            <small>Recommended playbook</small>
            {item.playbook.map((step, index) => (
              <span key={step}>
                <i>{index + 1}</i>
                {step}
              </span>
            ))}
          </div>
          <div className="exception-actions">
            <button
              onClick={() => draftUpdate(loadId, "Customer delay notification")}
            >
              Draft update
            </button>
            <button onClick={() => resolveException(item.id)}>
              Mark resolved
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}

function StopSummary({
  number,
  type,
  facility,
  address,
  window,
  status,
}: {
  number: string;
  type: string;
  facility: string;
  address: string;
  window: string;
  status: string;
}) {
  return (
    <div className="stop-summary-row">
      <span className={`stop-number ${type.toLowerCase()}`}>{number}</span>
      <p>
        <small>{type}</small>
        <b>{facility}</b>
        <span>{address}</span>
      </p>
      <p>
        <small>Appointment</small>
        <b>{window}</b>
      </p>
      <span className="status-pill green">{status}</span>
    </div>
  );
}
function MetricValue({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <small>{label}</small>
      <b>{value}</b>
    </span>
  );
}
function tone(health: string) {
  return health === "Critical"
    ? "red"
    : health === "At risk" || health === "Watch"
      ? "amber"
      : health === "Complete"
        ? "slate"
        : "green";
}

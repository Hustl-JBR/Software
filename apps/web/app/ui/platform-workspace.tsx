"use client";

import { useState } from "react";
import { useOperationsDemo } from "./operations-demo-provider";

export function TrackingWorkspace() {
  const { state } = useOperationsDemo();
  const [filter, setFilter] = useState("All active");
  const [selected, setSelected] = useState("atl-4821");
  const filters = [
    "All active",
    "On time",
    "At risk",
    "Late",
    "Tracking stale",
    "Tracking lost",
    "At pickup",
    "In transit",
    "At delivery",
  ];
  const loads = state.loads
    .filter((load) => load.progress > 0 && load.progress < 100)
    .filter(
      (load) =>
        filter === "All active" ||
        (filter === "On time" && load.etaStatus === "On time") ||
        (filter === "At risk" && load.health === "At risk") ||
        (filter === "Late" && load.etaStatus === "Late") ||
        (filter === "Tracking stale" && load.tracking === "Paused") ||
        (filter === "Tracking lost" && load.tracking === "Paused") ||
        (filter === "In transit" && load.status === "In transit"),
    );
  const detail = state.loads.find((load) => load.id === selected) ?? loads[0];
  return (
    <>
      <WorkspaceHeading
        eyebrow="Synthetic fleet visibility"
        title="Global tracking"
        subtitle="Every active truck, ETA, and tracking exception in one operational view."
        badge="No GPS or map provider connected"
      />
      <div className="filter-strip global-filters">
        {filters.map((name) => (
          <button
            className={filter === name ? "active" : ""}
            onClick={() => setFilter(name)}
            key={name}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="global-tracking-grid">
        <section className="panel fleet-map">
          <div className="map-grid" />
          <span className="synthetic-watermark">SYNTHETIC NETWORK MAP</span>
          {loads.map((load, index) => (
            <button
              key={load.id}
              className={`fleet-truck ${selected === load.id ? "selected" : ""}`}
              style={{
                left: `${18 + ((index * 17) % 68)}%`,
                top: `${24 + ((index * 19) % 55)}%`,
              }}
              onClick={() => setSelected(load.id)}
            >
              ▰<small>{load.number}</small>
            </button>
          ))}
        </section>
        <section className="panel tracking-list">
          {loads.map((load) => (
            <button
              className={selected === load.id ? "selected" : ""}
              onClick={() => setSelected(load.id)}
              key={load.id}
            >
              <span>
                <b>{load.number}</b>
                <small>
                  {load.driver} · {load.carrier}
                </small>
              </span>
              <span>
                <b>{load.currentLocation}</b>
                <small>{load.lastUpdate}</small>
              </span>
              <span
                className={`status-pill ${load.etaStatus === "Late" ? "amber" : "green"}`}
              >
                {load.etaStatus}
              </span>
            </button>
          ))}
        </section>
        <aside className="panel tracking-detail">
          <p className="overline">Selected truck</p>
          <h2>{detail?.number}</h2>
          <p>
            {detail?.origin} → {detail?.destination}
          </p>
          <div className="driver-contact-summary">
            <span className="avatar">LM</span>
            <p>
              <b>{detail?.driver}</b>
              <small>
                {detail?.carrier}
                <br />
                •••-•••-0187 · authorized reveal required
              </small>
            </p>
          </div>
          <dl>
            <div>
              <dt>Current location</dt>
              <dd>{detail?.currentLocation}</dd>
            </div>
            <div>
              <dt>ETA</dt>
              <dd>{detail?.eta}</dd>
            </div>
            <div>
              <dt>Appointment</dt>
              <dd>Aug 1 · 09:00–11:00</dd>
            </div>
            <div>
              <dt>Next milestone</dt>
              <dd>{detail?.nextAction}</dd>
            </div>
          </dl>
          <a
            className="button button-primary full-button"
            href={`/org/atlas-north/loads/${detail?.id}`}
          >
            Open load operations
          </a>
        </aside>
      </div>
    </>
  );
}

const carriers = [
  {
    name: "Summit Freight",
    status: "Approved",
    warning: "None",
    onTime: "97%",
    tracking: "99%",
    relationship: "Preferred",
  },
  {
    name: "Cobalt Express",
    status: "Approved with conditions",
    warning: "Insurance expires in 12 days",
    onTime: "94%",
    tracking: "96%",
    relationship: "Good",
  },
  {
    name: "Oak River Freight",
    status: "Manual review required",
    warning: "Contact identity mismatch",
    onTime: "88%",
    tracking: "82%",
    relationship: "New",
  },
  {
    name: "Granite State Transport",
    status: "Temporarily blocked",
    warning: "Authority inactive",
    onTime: "91%",
    tracking: "89%",
    relationship: "Review",
  },
  {
    name: "Pioneer Cartage",
    status: "Approved",
    warning: "None",
    onTime: "95%",
    tracking: "97%",
    relationship: "Preferred",
  },
  {
    name: "Legacy Roadways",
    status: "Do not use",
    warning: "Previously blocked · high cancellation",
    onTime: "76%",
    tracking: "68%",
    relationship: "Blocked",
  },
];
export function NetworkWorkspace() {
  const [tab, setTab] = useState("Carriers");
  const [query, setQuery] = useState("");
  const tabs = ["Carriers", "Drivers", "Customers", "Facilities", "Lanes"];
  return (
    <>
      <WorkspaceHeading
        eyebrow="Relationship intelligence"
        title="Network"
        subtitle="Synthetic carrier, driver, customer, facility, and lane intelligence."
        badge="Demo profiles"
      />
      <nav className="operations-tabs section-tabs">
        {tabs.map((name) => (
          <button
            className={tab === name ? "active" : ""}
            onClick={() => setTab(name)}
            key={name}
          >
            {name}
          </button>
        ))}
      </nav>
      <section className="panel network-workspace">
        <div className="loads-tools">
          <label className="loads-search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${tab.toLowerCase()}`}
            />
          </label>
          <span>All values are synthetic</span>
        </div>
        {tab === "Carriers" ? (
          <CarrierDirectory query={query} />
        ) : tab === "Drivers" ? (
          <SimpleDirectory
            headers={[
              "Driver",
              "Carrier",
              "Contact status",
              "Tracking consent",
              "Current load",
              "Last contact",
            ]}
            rows={[
              [
                "Luis Martinez",
                "Summit Freight",
                "Available",
                "Accepted",
                "ATL-4821",
                "12 min ago",
              ],
              [
                "Tanya Brooks",
                "BlueLine Logistics",
                "No answer",
                "Requested",
                "ATL-4818",
                "42 min ago",
              ],
              [
                "Evan Cole",
                "Redwood Transport",
                "Available",
                "Accepted",
                "ATL-4812",
                "8 min ago",
              ],
            ]}
          />
        ) : tab === "Customers" ? (
          <SimpleDirectory
            headers={[
              "Customer",
              "Terms",
              "Revenue",
              "Margin",
              "Open loads",
              "Open issues",
            ]}
            rows={[
              ["Hawthorne Home", "Net 30", "$184,200", "19.8%", "4", "0"],
              ["Northstar Retail", "Net 45", "$142,800", "14.2%", "3", "2"],
              ["Meridian Foods", "Net 30", "$98,400", "21.1%", "2", "1"],
            ]}
          />
        ) : tab === "Facilities" ? (
          <SimpleDirectory
            headers={[
              "Facility",
              "Market",
              "Avg dwell",
              "Reliability",
              "Parking",
              "Risk note",
            ]}
            rows={[
              [
                "Atlas Nashville Warehouse",
                "Nashville",
                "1.3h",
                "96%",
                "Limited",
                "Call before dispatch",
              ],
              [
                "Atlanta Distribution Center",
                "Atlanta",
                "2.4h",
                "81%",
                "No",
                "Lumper fees common",
              ],
              [
                "Georgia Pacific DC",
                "Savannah",
                "3.1h",
                "74%",
                "Yes",
                "Appointment delays",
              ],
            ]}
          />
        ) : (
          <SimpleDirectory
            headers={[
              "Lane",
              "Volume",
              "Avg buy",
              "Avg sell",
              "Margin",
              "Common exception",
            ]}
            rows={[
              [
                "Nashville → Atlanta",
                "38",
                "$2,940",
                "$3,690",
                "20.3%",
                "Dwell",
              ],
              [
                "Dallas → Memphis",
                "22",
                "$4,110",
                "$4,880",
                "15.8%",
                "Weather",
              ],
              [
                "Chicago → Columbus",
                "31",
                "$2,720",
                "$3,420",
                "20.5%",
                "Tracking start",
              ],
            ]}
          />
        )}
      </section>
    </>
  );
}
function CarrierDirectory({ query }: { query: string }) {
  return (
    <div className="directory-table">
      <div className="directory-head">
        <span>Carrier</span>
        <span>Compliance result</span>
        <span>Warning</span>
        <span>On time</span>
        <span>Tracking</span>
        <span>Relationship</span>
      </div>
      {carriers
        .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
        .map((c) => (
          <a
            href={`/org/atlas-north/network/carriers/${c.name.toLowerCase().replaceAll(" ", "-")}`}
            className="directory-row"
            key={c.name}
          >
            <b>{c.name}</b>
            <span
              className={`status-pill ${c.status.includes("Approved") ? "green" : c.status === "Do not use" ? "red" : "amber"}`}
            >
              {c.status}
            </span>
            <span>{c.warning}</span>
            <span>{c.onTime}</span>
            <span>{c.tracking}</span>
            <span>{c.relationship} →</span>
          </a>
        ))}
    </div>
  );
}
function SimpleDirectory({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="directory-table">
      <div className="directory-head">
        {headers.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      {rows.map((row, index) => (
        <div className="directory-row" key={index}>
          {row.map((value, i) =>
            i === 0 ? <b key={i}>{value}</b> : <span key={i}>{value}</span>,
          )}
        </div>
      ))}
    </div>
  );
}

export function DocumentsWorkspace() {
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const docs = [
    "Rate confirmation",
    "Bill of lading",
    "Proof of delivery",
    "Carrier invoice",
    "Lumper receipt",
    "Insurance certificate",
    "W-9",
    "Carrier agreement",
    "Claims document",
  ];
  return (
    <>
      <WorkspaceHeading
        eyebrow="Evidence control"
        title="Documents"
        subtitle="Review freight, carrier, compliance, and financial evidence."
        badge="Synthetic documents"
      />
      <section className="panel documents-workspace">
        <div className="directory-head document-head">
          <span>Document</span>
          <span>Related entity</span>
          <span>Received</span>
          <span>Validation</span>
          <span>Reviewer</span>
          <span>Actions</span>
        </div>
        {docs.map((name, index) => {
          const status =
            statuses[name] ??
            (index === 2 ? "Missing" : index === 3 ? "Mismatch" : "Verified");
          return (
            <div className="document-record" key={name}>
              <span>
                ▤ <b>{name}</b>
              </span>
              <span>{index > 4 ? "Summit Freight" : "ATL-4821"}</span>
              <span>
                {status === "Missing" ? "Not received" : "Today · 10:24"}
              </span>
              <span
                className={`status-pill ${status === "Verified" ? "green" : "amber"}`}
              >
                {status}
              </span>
              <span>{index > 4 ? "Risk team" : "Jordan Ellis"}</span>
              <span>
                <button>Preview</button>
                <button
                  onClick={() =>
                    setStatuses((s) => ({ ...s, [name]: "Reviewed" }))
                  }
                >
                  Mark reviewed
                </button>
                <button
                  onClick={() =>
                    setStatuses((s) => ({ ...s, [name]: "Mismatch" }))
                  }
                >
                  Flag mismatch
                </button>
              </span>
            </div>
          );
        })}
      </section>
    </>
  );
}

export function AnalyticsWorkspace() {
  return (
    <>
      <WorkspaceHeading
        eyebrow="Decision intelligence"
        title="Analytics"
        subtitle="Every metric answers a management question, using connected synthetic operations data."
        badge="Synthetic analytics"
      />
      <section className="analytics-questions">
        <DecisionCard
          question="Which customers generate revenue but poor margin?"
          answer="Northstar Retail"
          metric="$142.8k revenue · 14.2% margin"
          action="Review pricing policy"
        />
        <DecisionCard
          question="Which facilities create the most detention?"
          answer="Georgia Pacific DC"
          metric="3.1h average dwell · $4,820 exposure"
          action="Open facility intelligence"
        />
        <DecisionCard
          question="Which carriers cancel most often?"
          answer="Legacy Roadways"
          metric="11.8% cancellation · 68% tracking"
          action="Review carrier block"
        />
        <DecisionCard
          question="Which lanes are consistently underpriced?"
          answer="Dallas → Memphis"
          metric="15.8% average margin · target 20%"
          action="Open lane pricing"
        />
      </section>
      <section className="panel analytics-scorecard">
        <div className="panel-heading">
          <div>
            <p className="overline">Operating scorecard</p>
            <h2>Service and financial performance</h2>
          </div>
        </div>
        <div className="analytics-metrics">
          {[
            ["Revenue", "$1.42M", "+8.4%"],
            ["Gross profit", "$272k", "19.2%"],
            ["Load volume", "384", "+11.2%"],
            ["On-time pickup", "94.8%", "+1.7 pts"],
            ["On-time delivery", "92.6%", "-0.8 pts"],
            ["Tracking compliance", "96.1%", "+3.2 pts"],
            ["Carrier acceptance", "73.4%", "-2.1 pts"],
            ["Quote win rate", "41.8%", "+4.4 pts"],
            ["Average dwell", "1.9h", "-0.3h"],
            ["Detention exposure", "$18.4k", "+6.2%"],
            ["Exception frequency", "12.7%", "-1.4 pts"],
            ["Customer margin", "18.6%", "+0.9 pts"],
          ].map(([label, value, delta]) => (
            <span key={label}>
              <small>{label}</small>
              <strong>{value}</strong>
              <b>{delta}</b>
            </span>
          ))}
        </div>
      </section>
    </>
  );
}
function DecisionCard({
  question,
  answer,
  metric,
  action,
}: {
  question: string;
  answer: string;
  metric: string;
  action: string;
}) {
  return (
    <article className="panel decision-card">
      <p>{question}</p>
      <h2>{answer}</h2>
      <strong>{metric}</strong>
      <button>{action} →</button>
    </article>
  );
}

export function SettingsWorkspace() {
  const [values, setValues] = useState({
    margin: 20,
    quote: 5000,
    risk: 75,
    insurance: 14,
    tracking: 30,
    updates: 120,
    escalation: 45,
    visibility: "Authorized operations only",
    autonomy: "Draft and recommend",
  });
  const input = (key: keyof typeof values, label: string, suffix: string) => (
    <label>
      {label}
      <div>
        <input
          value={values[key]}
          onChange={(e) =>
            setValues((v) => ({ ...v, [key]: Number(e.target.value) }))
          }
        />
        <span>{suffix}</span>
      </div>
    </label>
  );
  return (
    <>
      <WorkspaceHeading
        eyebrow="Organization controls"
        title="Settings"
        subtitle="Configure approval boundaries, risk thresholds, contact rules, and AI permissions."
        badge="Demo configuration only"
      />
      <div className="settings-layout">
        <nav className="panel settings-nav">
          {[
            "Organization",
            "Users and roles",
            "Approval policies",
            "Contact rules",
            "Tracking policies",
            "Compliance policies",
            "Notifications",
            "Financial thresholds",
            "AI permissions",
            "Demo settings",
          ].map((name, index) => (
            <button className={index === 0 ? "active" : ""} key={name}>
              {name}
            </button>
          ))}
        </nav>
        <section className="panel policy-settings">
          <div className="panel-heading">
            <div>
              <p className="overline">Operating policies</p>
              <h2>Decision thresholds</h2>
              <p>Changes affect this browser demo only.</p>
            </div>
          </div>
          <div className="settings-grid">
            {input("margin", "Minimum target margin", "%")}
            {input("quote", "Quote approval threshold", "USD")}
            {input("risk", "Carrier-risk threshold", "score")}
            {input("insurance", "Insurance expiration warning", "days")}
            {input("tracking", "Tracking freshness threshold", "min")}
            {input("updates", "Customer update frequency", "min")}
            {input("escalation", "Exception escalation timing", "min")}
            <label>
              Driver contact visibility
              <select
                value={values.visibility}
                onChange={(e) =>
                  setValues((v) => ({ ...v, visibility: e.target.value }))
                }
              >
                <option>Authorized operations only</option>
                <option>Managers only</option>
                <option>Masked for all users</option>
              </select>
            </label>
            <label>
              Maximum Atlas autonomy
              <select
                value={values.autonomy}
                onChange={(e) =>
                  setValues((v) => ({ ...v, autonomy: e.target.value }))
                }
              >
                <option>Draft and recommend</option>
                <option>Read-only analysis</option>
                <option>Pre-approved low-risk actions</option>
              </select>
            </label>
          </div>
          <div className="policy-boundary">
            <span>◈</span>
            <p>
              <b>Human approval boundary</b>
              <small>
                Atlas may analyze, prioritize, and create drafts. Carrier
                selection, quotes above threshold, sensitive-data access, and
                consequential communications require a person.
              </small>
            </p>
          </div>
          <button className="button button-primary">Save demo policies</button>
        </section>
      </div>
    </>
  );
}

function WorkspaceHeading({
  eyebrow,
  title,
  subtitle,
  badge,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  badge: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="overline">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      <span className="synthetic-chip">{badge}</span>
    </div>
  );
}

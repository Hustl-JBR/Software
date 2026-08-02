"use client";

import { useMemo, useState } from "react";
import { EnvironmentChip, EmptyState } from "./atlas-primitives";
import { money, type LoadWorkspaceRow } from "@/lib/atlas-view-models";

const filters = [
  "All",
  "Needs attention",
  "Intake",
  "Awaiting quote",
  "Awaiting approval",
  "Sourcing",
  "Unassigned",
  "Dispatch pending",
  "In transit",
  "Documents missing",
  "Completed",
];

export function LoadsWorkspaceView({
  slug,
  rows,
  mode,
}: {
  slug: string;
  rows: LoadWorkspaceRow[];
  mode: "demo" | "staging";
}) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const visible = useMemo(
    () =>
      rows.filter((row) => {
        const term = search.toLowerCase();
        const searchable =
          `${row.number} ${row.customer} ${row.carrier} ${row.driver} ${row.origin} ${row.destination} ${row.owner}`.toLowerCase();
        if (term && !searchable.includes(term)) return false;
        if (filter === "Needs attention") return row.attention;
        if (filter !== "All") return row.category === filter;
        return true;
      }),
    [filter, rows, search],
  );
  const loads = rows.filter((row) => !row.number.startsWith("REQ-"));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="overline">Execution workspace</p>
          <h1>Loads</h1>
          <p className="page-subtitle">
            One operational view across intake, quoting, sourcing, dispatch, and
            execution. <EnvironmentChip mode={mode} />
          </p>
        </div>
        <a className="button button-primary" href={`/org/${slug}/requests/new`}>
          ＋ New shipment
        </a>
      </div>
      <section className="workspace-summary">
        <Summary
          value={rows.filter((row) => row.attention).length}
          label="Need attention"
          detail="Persistent action required"
        />
        <Summary
          value={loads.filter((row) => row.category === "In transit").length}
          label="In transit"
          detail={
            mode === "staging" ? "Manual tracking only" : "Demo tracking active"
          }
        />
        <Summary
          value={rows.filter((row) => row.category === "Unassigned").length}
          label="Unassigned"
          detail="Owner or carrier required"
        />
        <Summary
          value={rows.length}
          label="Visible records"
          detail="Requests and operational loads"
        />
      </section>
      <section className="panel loads-workspace-panel">
        <div className="loads-tools">
          <label className="loads-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search load, customer, carrier, driver, lane, or owner"
            />
          </label>
          <span>
            {visible.length} of {rows.length} records
          </span>
        </div>
        <div className="filter-strip">
          {filters.map((name) => (
            <button
              key={name}
              className={filter === name ? "active" : ""}
              onClick={() => setFilter(name)}
            >
              {name}
              {name === "Needs attention" && (
                <b>{rows.filter((row) => row.attention).length}</b>
              )}
            </button>
          ))}
        </div>
        <div className="operations-table">
          <div className="ops-table-head staging-load-head">
            <span>Load / customer</span>
            <span>Route & appointments</span>
            <span>Carrier / driver</span>
            <span>Status & health</span>
            <span>Tracking</span>
            <span>Financials</span>
            <span>Next action / owner</span>
          </div>
          {visible.map((row) => {
            const gp =
              row.revenueCents !== undefined &&
              row.carrierCostCents !== undefined
                ? row.revenueCents - row.carrierCostCents
                : undefined;
            return (
              <a href={row.href} className="ops-load-row" key={row.id}>
                <span>
                  <b>{row.number}</b>
                  <small>{row.customer}</small>
                </span>
                <span>
                  <b>
                    {row.origin} → {row.destination}
                  </b>
                  <small>
                    {row.pickup} / {row.delivery}
                  </small>
                </span>
                <span>
                  <b>{row.carrier}</b>
                  <small>{row.driver}</small>
                </span>
                <span>
                  <i className={`health-dot ${tone(row.health)}`} />
                  <b>{row.status}</b>
                  <small>{row.health}</small>
                </span>
                <span>
                  <b>{row.tracking}</b>
                  <small>{row.trackingFreshness}</small>
                </span>
                <span>
                  <b>{money(row.revenueCents)}</b>
                  <small>
                    {gp === undefined
                      ? "No complete financial ledger"
                      : `${money(gp)} expected GP`}
                  </small>
                </span>
                <span>
                  <b className="next-action">{row.nextAction}</b>
                  <small>{row.owner} · Open →</small>
                </span>
              </a>
            );
          })}
        </div>
        {visible.length === 0 && (
          <EmptyState
            title={
              rows.length
                ? "No matching operations"
                : "No shipment operations yet"
            }
            body={
              rows.length
                ? "Adjust the search or select another operational filter."
                : "Create the first shipment request to start the persistent operating record."
            }
            action={
              rows.length
                ? undefined
                : {
                    href: `/org/${slug}/requests/new`,
                    label: "Create first shipment",
                  }
            }
          />
        )}
      </section>
    </>
  );
}

function Summary({
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

function tone(health: LoadWorkspaceRow["health"]) {
  return health === "Critical"
    ? "red"
    : health === "At risk" || health === "Watch"
      ? "amber"
      : health === "Complete"
        ? "slate"
        : "green";
}

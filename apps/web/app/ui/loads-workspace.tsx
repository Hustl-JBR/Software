"use client";

import { useMemo, useState } from "react";
import { useOperationsDemo } from "./operations-demo-provider";

const filters = [
  "All loads",
  "Needs attention",
  "Unassigned",
  "Picking up today",
  "In transit",
  "Delayed",
  "Delivering today",
  "Documents missing",
  "Completed",
];

export function LoadsWorkspace({ slug }: { slug: string }) {
  const { state } = useOperationsDemo();
  const [filter, setFilter] = useState("All loads");
  const [search, setSearch] = useState("");
  const rows = useMemo(
    () =>
      state.loads.filter((load) => {
        const term = search.toLowerCase();
        const searchable =
          `${load.number} ${load.customer} ${load.carrier} ${load.driver} ${load.origin} ${load.destination}`.toLowerCase();
        if (term && !searchable.includes(term)) return false;
        if (filter === "Needs attention")
          return ["At risk", "Critical", "Watch"].includes(load.health);
        if (filter === "Unassigned") return load.carrier === "Unassigned";
        if (filter === "Picking up today")
          return load.pickup.includes("Jul 31") && load.progress < 15;
        if (filter === "In transit") return load.status === "In transit";
        if (filter === "Delayed")
          return load.status === "Delayed" || load.health === "Critical";
        if (filter === "Delivering today")
          return load.delivery.includes("Aug 1") && load.progress > 40;
        if (filter === "Documents missing")
          return load.status === "Documents pending";
        if (filter === "Completed")
          return ["Delivered", "Ready to invoice"].includes(load.status);
        return true;
      }),
    [state.loads, filter, search],
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="overline">Execution workspace</p>
          <h1>Loads</h1>
          <p className="page-subtitle">
            One operational view across every stage of the freight lifecycle.{" "}
            <span className="synthetic-chip">Synthetic demo data</span>
          </p>
        </div>
        <a className="button button-primary" href={`/org/${slug}/requests/new`}>
          ＋ New shipment
        </a>
      </div>
      <section className="workspace-summary">
        <div>
          <span className="attention-count">
            {state.attention.filter((item) => item.status === "Open").length}
          </span>
          <p>
            <b>Loads need attention</b>
            <small>Prioritized by operational impact</small>
          </p>
        </div>
        <div>
          <strong>
            {state.loads.filter((load) => load.status === "In transit").length}
          </strong>
          <p>
            <b>In transit</b>
            <small>
              {state.loads.filter((load) => load.tracking === "Live").length}{" "}
              tracking live
            </small>
          </p>
        </div>
        <div>
          <strong>
            {state.loads.filter((load) => load.carrier === "Unassigned").length}
          </strong>
          <p>
            <b>Unassigned</b>
            <small>Carrier action required</small>
          </p>
        </div>
        <div>
          <strong>
            $
            {state.loads
              .reduce((sum, load) => sum + (load.revenue - load.carrierCost), 0)
              .toLocaleString()}
          </strong>
          <p>
            <b>Expected gross profit</b>
            <small>Across visible demo loads</small>
          </p>
        </div>
      </section>
      <section className="panel loads-workspace-panel">
        <div className="loads-tools">
          <label className="loads-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search load, customer, carrier, driver, or lane"
            />
          </label>
          <span>
            {rows.length} of {state.loads.length} loads
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
                <b>
                  {
                    state.attention.filter((item) => item.status === "Open")
                      .length
                  }
                </b>
              )}
            </button>
          ))}
        </div>
        <div className="operations-table">
          <div className="ops-table-head">
            <span>Load / customer</span>
            <span>Route & appointments</span>
            <span>Carrier / driver</span>
            <span>Status & health</span>
            <span>Tracking / ETA</span>
            <span>Financials</span>
            <span>Next action</span>
          </div>
          {rows.map((load) => {
            const profit = load.revenue - load.carrierCost;
            const margin = load.revenue ? (profit / load.revenue) * 100 : 0;
            return (
              <a
                href={`/org/${slug}/loads/${load.id}`}
                className="ops-load-row"
                key={load.id}
              >
                <span>
                  <b>{load.number}</b>
                  <small>{load.customer}</small>
                </span>
                <span>
                  <b>
                    {load.origin} → {load.destination}
                  </b>
                  <small>
                    {load.pickup} / {load.delivery}
                  </small>
                </span>
                <span>
                  <b>{load.carrier}</b>
                  <small>{load.driver}</small>
                </span>
                <span>
                  <i className={`health-dot ${tone(load.health)}`} />
                  <b>{load.status}</b>
                  <small>{load.health}</small>
                </span>
                <span>
                  <b>{load.tracking}</b>
                  <small
                    className={load.etaStatus === "Late" ? "late-text" : ""}
                  >
                    {load.etaStatus} · {load.eta}
                  </small>
                </span>
                <span>
                  <b>
                    {load.revenue
                      ? `$${load.revenue.toLocaleString()}`
                      : "Not quoted"}
                  </b>
                  <small>
                    {load.revenue
                      ? `$${profit.toLocaleString()} GP · ${margin.toFixed(1)}%`
                      : `$${load.carrierCost.toLocaleString()} market cost`}
                  </small>
                </span>
                <span>
                  <b className="next-action">{load.nextAction}</b>
                  <small>Open load →</small>
                </span>
              </a>
            );
          })}
        </div>
        {rows.length === 0 && (
          <div className="empty-state">
            <h3>No matching loads</h3>
            <p>Adjust the search or select another operational filter.</p>
          </div>
        )}
      </section>
    </>
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

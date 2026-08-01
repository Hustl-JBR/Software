"use client";

import { useOperationsDemo } from "./operations-demo-provider";

export function AttentionQueue({ slug }: { slug: string }) {
  const { state, actOnAttention, draftUpdate } = useOperationsDemo();
  const active = state.attention.filter(
    (item) => item.status === "Open" || item.status === "Acknowledged",
  );
  return (
    <section className="panel attention-queue">
      <div className="panel-heading">
        <div>
          <p className="overline red-overline">Operational priority</p>
          <h2>Attention required</h2>
          <p>
            Atlas ranks the work most likely to affect service, cost, or
            customer trust.
          </p>
        </div>
        <a href={`/org/${slug}/loads?filter=attention`} className="panel-link">
          Open loads workspace →
        </a>
      </div>
      <div className="attention-list">
        {active.map((item) => {
          const load = state.loads.find(
            (candidate) => candidate.id === item.loadId,
          );
          return (
            <article className="attention-row" key={item.id}>
              <span
                className={`severity-rail ${item.severity.toLowerCase()}`}
              />
              <div className="attention-load">
                <span
                  className={`severity-label ${item.severity.toLowerCase()}`}
                >
                  {item.severity}
                </span>
                <b>{load?.number}</b>
                <small>
                  {load?.origin} → {load?.destination}
                </small>
              </div>
              <div className="attention-problem">
                <h3>{item.problem}</h3>
                <p>{item.why}</p>
                <span className="atlas-recommendation">
                  ✦ {item.recommendation}
                </span>
              </div>
              <div className="attention-clock">
                <b>{item.clock}</b>
                <small>{item.owner}</small>
                <span
                  className={`attention-status ${item.status.toLowerCase()}`}
                >
                  {item.status}
                </span>
              </div>
              <div className="attention-actions">
                <a
                  className="inline-action"
                  href={`/org/${slug}/loads/${item.loadId}`}
                >
                  Open load
                </a>
                <button onClick={() => actOnAttention(item.id, "assign")}>
                  Assign to me
                </button>
                <button onClick={() => draftUpdate(item.loadId)}>
                  Draft update
                </button>
                <button onClick={() => actOnAttention(item.id, "resolve")}>
                  Resolve
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {active.length === 0 && (
        <div className="all-clear attention-clear">
          <span>✓</span>
          <p>
            <b>Attention queue cleared</b>
            <small>Resolved work has moved into recent activity.</small>
          </p>
        </div>
      )}
    </section>
  );
}

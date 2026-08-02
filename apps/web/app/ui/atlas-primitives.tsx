import Link from "next/link";

export function EnvironmentChip({ mode }: { mode: "demo" | "staging" }) {
  return (
    <span
      className={`synthetic-chip ${mode === "staging" ? "stage-chip" : ""}`}
    >
      {mode === "staging" ? "STAGING" : "Synthetic demo data"}
    </span>
  );
}

export function WorkspaceHeading({
  eyebrow,
  title,
  subtitle,
  badge,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="overline">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-subtitle">
          {subtitle} {badge}
        </p>
      </div>
      {action && (
        <Link className="button button-primary" href={action.href}>
          ＋ {action.label}
        </Link>
      )}
    </div>
  );
}

export function EmptyState({
  icon = "◇",
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="empty-state controlled-empty">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action && (
        <Link className="button button-secondary" href={action.href}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function StatusBadge({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: "green" | "amber" | "red" | "blue" | "slate" | "violet";
}) {
  return <span className={`status-pill ${tone}`}>{label}</span>;
}

export function InactiveState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="inactive-state">
      <StatusBadge label="Not active in staging yet" tone="slate" />
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

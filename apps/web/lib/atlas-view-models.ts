export type LoadWorkspaceRow = {
  id: string;
  number: string;
  customer: string;
  origin: string;
  destination: string;
  pickup: string;
  delivery: string;
  carrier: string;
  driver: string;
  status: string;
  health: "Healthy" | "Watch" | "At risk" | "Critical" | "Complete";
  tracking: string;
  trackingFreshness: string;
  revenueCents?: number;
  carrierCostCents?: number;
  nextAction: string;
  owner: string;
  href: string;
  attention: boolean;
  category:
    | "Intake"
    | "Awaiting quote"
    | "Awaiting approval"
    | "Sourcing"
    | "Unassigned"
    | "Dispatch pending"
    | "In transit"
    | "Documents missing"
    | "Completed";
};

export type TrackingLoadView = {
  id: string;
  number: string;
  route: string;
  driver: string;
  dispatcher: string;
  carrier: string;
  status: string;
  location: string;
  updatedAt: string;
  notes?: string;
  nextAction: string;
  href: string;
};

export type NetworkCarrierView = {
  id: string;
  name: string;
  reviewResult: string;
  authority: string;
  insurance: string;
  warning: string;
  relationship: string;
  lastVerified: string;
  doNotUse: boolean;
  href: string;
};

export type ActivityView = {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: "green" | "blue" | "amber" | "violet" | "slate";
};

export type AttentionView = {
  id: string;
  title: string;
  detail: string;
  owner: string;
  href: string;
  severity: "Critical" | "High" | "Medium";
};

export function money(cents?: number) {
  return cents === undefined
    ? "Not available"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(cents / 100);
}

export function shortDate(value: Date | string | null | undefined) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function relativeTime(value: Date | string | null | undefined) {
  if (!value) return "No updates";
  const date = new Date(value);
  const minutes = Math.max(
    0,
    Math.round((Date.now() - date.valueOf()) / 60_000),
  );
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hr ago`;
  return shortDate(date);
}

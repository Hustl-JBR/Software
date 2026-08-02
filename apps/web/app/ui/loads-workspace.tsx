"use client";

import { useOperationsDemo } from "./operations-demo-provider";
import { LoadsWorkspaceView } from "./loads-workspace-view";
import type { LoadWorkspaceRow } from "@/lib/atlas-view-models";

export function LoadsWorkspace({ slug }: { slug: string }) {
  const { state } = useOperationsDemo();
  const rows: LoadWorkspaceRow[] = state.loads.map((load) => ({
    id: load.id,
    number: load.number,
    customer: load.customer,
    origin: load.origin,
    destination: load.destination,
    pickup: load.pickup,
    delivery: load.delivery,
    carrier: load.carrier,
    driver: load.driver,
    status: load.status,
    health: load.health,
    tracking: load.tracking,
    trackingFreshness: load.lastUpdate,
    revenueCents: load.revenue * 100,
    carrierCostCents: load.carrierCost * 100,
    nextAction: load.nextAction,
    owner: load.owner,
    href: `/org/${slug}/loads/${load.id}`,
    attention: ["Watch", "At risk", "Critical"].includes(load.health),
    category:
      load.status === "Awaiting review"
        ? "Intake"
        : load.status === "Ready to quote"
          ? "Awaiting quote"
          : load.status === "Awaiting customer approval"
            ? "Awaiting approval"
            : load.status === "Sourcing carrier"
              ? "Sourcing"
              : load.carrier === "Unassigned"
                ? "Unassigned"
                : load.status === "Carrier assigned" ||
                    load.status === "Pickup scheduled"
                  ? "Dispatch pending"
                  : load.status === "In transit" ||
                      load.status === "At risk" ||
                      load.status === "Delayed"
                    ? "In transit"
                    : load.status === "Documents pending"
                      ? "Documents missing"
                      : "Completed",
  }));
  return <LoadsWorkspaceView slug={slug} rows={rows} mode="demo" />;
}

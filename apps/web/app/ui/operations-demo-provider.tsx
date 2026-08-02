"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  initialOperationsDemoState,
  type OperationsDemoState,
} from "@/lib/operations-demo-data";
import { carrierSelectionBlockReason } from "@/lib/carrier-compliance";

type DemoAction =
  | "advance"
  | "pause"
  | "restore"
  | "traffic"
  | "weather"
  | "stopped"
  | "arrive-pickup"
  | "depart-pickup"
  | "arrive-delivery"
  | "complete";

type OperationsContext = {
  state: OperationsDemoState;
  actOnAttention: (
    id: string,
    action: "acknowledge" | "assign" | "resolve" | "snooze",
  ) => void;
  simulate: (loadId: string, action: DemoAction) => void;
  draftUpdate: (loadId: string, kind?: string) => void;
  logContactEvent: (
    loadId: string,
    contactName: string,
    action: "revealed" | "called",
  ) => void;
  resolveException: (id: string) => void;
  updatePricing: (
    loadId: string,
    field: "customerQuote" | "marketCost" | "targetMargin" | "riskBuffer",
    value: number,
  ) => void;
  updateCarrier: (
    id: string,
    stage: "Offer drafted" | "Countered" | "Selected",
  ) => void;
};

const Context = createContext<OperationsContext | null>(null);
let demoSessionState = initialOperationsDemoState;

export function OperationsDemoProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<OperationsDemoState>(demoSessionState);
  useEffect(() => {
    const saved = window.sessionStorage.getItem("atlas-operations-demo");
    if (saved) setState(JSON.parse(saved) as OperationsDemoState);
  }, []);
  const updateState = (
    updater: (current: OperationsDemoState) => OperationsDemoState,
  ) => {
    setState((current) => {
      const next = updater(current);
      demoSessionState = next;
      window.sessionStorage.setItem(
        "atlas-operations-demo",
        JSON.stringify(next),
      );
      return next;
    });
  };
  useEffect(() => {
    demoSessionState = state;
  }, [state]);
  const value = useMemo<OperationsContext>(
    () => ({
      state,
      actOnAttention(id, action) {
        updateState((current) => ({
          ...current,
          attention: current.attention.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status:
                    action === "resolve"
                      ? "Resolved"
                      : action === "snooze"
                        ? "Snoozed"
                        : action === "assign"
                          ? "Acknowledged"
                          : "Acknowledged",
                  owner: action === "assign" ? "Jordan Ellis" : item.owner,
                }
              : item,
          ),
          activity:
            action === "resolve"
              ? [
                  `Attention item resolved Â· ${current.attention.find((item) => item.id === id)?.problem}`,
                  ...current.activity,
                ]
              : current.activity,
        }));
      },
      simulate(loadId, action) {
        const delay = action === "traffic" ? 45 : action === "weather" ? 75 : 0;
        const label: Record<DemoAction, string> = {
          advance: "Truck advanced 18 synthetic miles",
          pause: "Synthetic tracking paused",
          restore: "Synthetic tracking restored",
          traffic: "Traffic delay added",
          weather: "Weather delay added",
          stopped: "Driver marked stopped",
          "arrive-pickup": "Driver arrived at pickup",
          "depart-pickup": "Driver departed pickup",
          "arrive-delivery": "Driver arrived at delivery",
          complete: "Delivery completed",
        };
        updateState((current) => {
          const selected = current.loads.find((load) => load.id === loadId);
          if (!selected) return current;
          const isDelay = delay > 0;
          const loads = current.loads.map((load) =>
            load.id !== loadId
              ? load
              : {
                  ...load,
                  progress:
                    action === "advance"
                      ? Math.min(100, load.progress + 8)
                      : action === "complete"
                        ? 100
                        : load.progress,
                  tracking:
                    action === "pause"
                      ? ("Paused" as const)
                      : action === "restore" || action === "advance"
                        ? ("Live" as const)
                        : action === "complete"
                          ? ("Complete" as const)
                          : load.tracking,
                  health: isDelay
                    ? ("At risk" as const)
                    : action === "complete"
                      ? ("Complete" as const)
                      : action === "restore"
                        ? ("Healthy" as const)
                        : load.health,
                  status: isDelay
                    ? ("Delayed" as const)
                    : action === "complete"
                      ? ("Delivered" as const)
                      : load.status,
                  etaStatus: isDelay
                    ? ("Late" as const)
                    : action === "complete"
                      ? ("Complete" as const)
                      : load.etaStatus,
                  eta: isDelay
                    ? `${delay} min late Â· 16:${delay === 45 ? "27" : "57"}`
                    : action === "complete"
                      ? "Delivered now"
                      : load.eta,
                  lastUpdate:
                    action === "pause" ? "Paused by operator" : "Just now",
                  currentLocation:
                    action === "advance"
                      ? "I-24 east of Monteagle, TN"
                      : load.currentLocation,
                  nextAction: isDelay
                    ? "Draft customer delay update"
                    : action === "complete"
                      ? "Collect proof of delivery"
                      : load.nextAction,
                },
          );
          const timeline = [
            {
              id: crypto.randomUUID(),
              loadId,
              title: label[action],
              detail: isDelay
                ? `Synthetic ETA moved ${delay} minutes beyond plan.`
                : "Operator changed the synthetic load state.",
              time: "Just now",
              tone: isDelay ? ("amber" as const) : ("blue" as const),
            },
            ...current.timeline,
          ];
          if (action === "pause") {
            const trackingAttention = current.attention.some(
              (item) =>
                item.loadId === loadId && item.problem.includes("tracking"),
            )
              ? current.attention
              : [
                  {
                    id: crypto.randomUUID(),
                    loadId,
                    severity: "High" as const,
                    problem: "Driver tracking was interrupted",
                    why: "Atlas can no longer confirm location freshness or ETA confidence.",
                    clock: "Action due now",
                    recommendation:
                      "Contact the driver or dispatcher and restore shipment-limited tracking.",
                    owner: "Jordan Ellis",
                    status: "Open" as const,
                  },
                  ...current.attention,
                ];
            return {
              ...current,
              loads,
              timeline,
              attention: trackingAttention,
            };
          }
          if (!isDelay) return { ...current, loads, timeline };
          const attention = current.attention.some(
            (item) => item.loadId === loadId && item.problem.includes("ETA"),
          )
            ? current.attention
            : [
                {
                  id: crypto.randomUUID(),
                  loadId,
                  severity: "High" as const,
                  problem: `Driver ETA is ${delay} minutes beyond the appointment plan`,
                  why: "The receiver and customer may need time to adjust operations.",
                  clock: "Action due now",
                  recommendation:
                    "Confirm the delay, draft a customer update, and monitor the next location ping.",
                  owner: "Jordan Ellis",
                  status: "Open" as const,
                },
                ...current.attention,
              ];
          const exceptions = [
            {
              id: crypto.randomUUID(),
              loadId,
              type: action === "weather" ? "Weather delay" : "Traffic delay",
              severity: "High" as const,
              source: "Operator simulation",
              detected: "Just now",
              evidence: `${delay} synthetic minutes added to the route.`,
              impact: "ETA is outside the planned arrival target.",
              playbook: [
                "Confirm driver status",
                "Recalculate ETA",
                "Notify customer",
                "Monitor next milestone",
              ],
              owner: "Jordan Ellis",
              status: "Open" as const,
              communication: "Needed" as const,
            },
            ...current.exceptions,
          ];
          return { ...current, loads, attention, exceptions, timeline };
        });
      },
      draftUpdate(loadId, kind = "Customer delay update") {
        updateState((current) => ({
          ...current,
          communications: [
            {
              id: crypto.randomUUID(),
              loadId,
              channel: "Customer email",
              title: kind,
              body: "Draft generated by Atlas: Your shipment has encountered a synthetic demo delay. The current estimated arrival is shown in Atlas, and our team is monitoring the next milestone. This draft has not been sent.",
              time: "Just now",
              status: "Unsent draft",
            },
            ...current.communications,
          ],
          exceptions: current.exceptions.map((item) =>
            item.loadId === loadId && item.status === "Open"
              ? { ...item, communication: "Drafted" as const }
              : item,
          ),
          activity: [
            `Unsent customer update drafted for ${current.loads.find((load) => load.id === loadId)?.number}`,
            ...current.activity,
          ],
        }));
      },
      logContactEvent(loadId, contactName, action) {
        updateState((current) => ({
          ...current,
          communications:
            action === "called"
              ? [
                  {
                    id: crypto.randomUUID(),
                    loadId,
                    channel: "Call summary" as const,
                    title: `Call logged · ${contactName}`,
                    body: "Synthetic call outcome recorded by the operator. No real call was placed.",
                    time: "Just now",
                    status: "Logged" as const,
                  },
                  ...current.communications,
                ]
              : current.communications,
          timeline: [
            {
              id: crypto.randomUUID(),
              loadId,
              title:
                action === "revealed"
                  ? "Sensitive contact detail viewed"
                  : "Contact attempt recorded",
              detail: `${contactName} · synthetic demo audit event`,
              time: "Just now",
              tone: "violet" as const,
            },
            ...current.timeline,
          ],
          activity: [
            `${action === "revealed" ? "Sensitive contact viewed" : "Call logged"} · ${contactName}`,
            ...current.activity,
          ],
        }));
      },
      resolveException(id) {
        updateState((current) => {
          const exception = current.exceptions.find((item) => item.id === id);
          return {
            ...current,
            exceptions: current.exceptions.map((item) =>
              item.id === id ? { ...item, status: "Resolved" as const } : item,
            ),
            attention: current.attention.map((item) =>
              item.loadId === exception?.loadId && item.status !== "Resolved"
                ? { ...item, status: "Resolved" as const }
                : item,
            ),
            activity: [
              `Exception resolved Â· ${exception?.type}`,
              ...current.activity,
            ],
          };
        });
      },
      updatePricing(loadId, field, value) {
        updateState((current) => ({
          ...current,
          pricing: current.pricing.map((price) =>
            price.loadId === loadId ? { ...price, [field]: value } : price,
          ),
        }));
      },
      updateCarrier(id, stage) {
        updateState((current) => {
          const selected = current.carriers.find(
            (carrier) => carrier.id === id,
          );
          const blockReason =
            selected && stage === "Selected"
              ? carrierSelectionBlockReason(
                  {
                    authority: selected.authority,
                    insuranceStatus: selected.insurance,
                    cargoLimit:
                      selected.name === "Oak River Freight" ? 50_000 : 100_000,
                  },
                  75_000,
                )
              : null;
          if (blockReason)
            return {
              ...current,
              activity: [
                `Carrier selection blocked · ${selected?.name} · ${blockReason}`,
                ...current.activity,
              ],
            };
          return {
            ...current,
            carriers: current.carriers.map((carrier) =>
              carrier.id === id
                ? { ...carrier, stage }
                : stage === "Selected" && carrier.stage === "Selected"
                  ? { ...carrier, stage: "Interested" as const }
                  : carrier,
            ),
          };
        });
      },
    }),
    [state],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useOperationsDemo() {
  const context = useContext(Context);
  if (!context) throw new Error("OperationsDemoProvider is missing");
  return context;
}

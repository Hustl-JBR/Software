export type LoadStage =
  | "Awaiting review"
  | "Ready to quote"
  | "Awaiting customer approval"
  | "Sourcing carrier"
  | "Carrier assigned"
  | "Pickup scheduled"
  | "In transit"
  | "At risk"
  | "Delayed"
  | "Delivered"
  | "Documents pending"
  | "Ready to invoice";

export type DemoOperationsLoad = {
  id: string;
  number: string;
  customer: string;
  origin: string;
  destination: string;
  pickup: string;
  delivery: string;
  carrier: string;
  driver: string;
  status: LoadStage;
  health: "Healthy" | "Watch" | "At risk" | "Critical" | "Complete";
  tracking: "Live" | "Paused" | "Not started" | "Complete";
  eta: string;
  etaStatus: "On time" | "At risk" | "Late" | "Pending" | "Complete";
  revenue: number;
  carrierCost: number;
  miles: number;
  progress: number;
  currentLocation: string;
  lastUpdate: string;
  nextAction: string;
  owner: string;
};

export type AttentionItem = {
  id: string;
  loadId: string;
  severity: "Critical" | "High" | "Medium";
  problem: string;
  why: string;
  clock: string;
  recommendation: string;
  owner: string;
  status: "Open" | "Acknowledged" | "Resolved" | "Snoozed";
};

export type DemoException = {
  id: string;
  loadId: string;
  type: string;
  severity: "Critical" | "High" | "Medium";
  source: string;
  detected: string;
  evidence: string;
  impact: string;
  playbook: string[];
  owner: string;
  status: "Open" | "Resolved";
  communication: "Needed" | "Drafted" | "Not required";
};

export type Communication = {
  id: string;
  loadId: string;
  channel:
    | "Customer email"
    | "Carrier email"
    | "Driver text"
    | "Internal note"
    | "Call summary"
    | "Automated update";
  title: string;
  body: string;
  time: string;
  status: "Sent" | "Unsent draft" | "Logged";
};

export type TimelineEvent = {
  id: string;
  loadId: string;
  title: string;
  detail: string;
  time: string;
  tone: "blue" | "green" | "amber" | "violet";
};
export type PricingState = {
  loadId: string;
  marketCost: number;
  customerQuote: number;
  targetMargin: number;
  riskBuffer: number;
  confidence: number;
  expires: string;
};
export type CarrierOption = {
  id: string;
  name: string;
  mc: string;
  dot: string;
  rate: number;
  pickupDistance: number;
  onTime: number;
  tracking: number;
  cancellations: number;
  laneLoads: number;
  insurance: string;
  authority: string;
  relationship: string;
  fit: number;
  stage:
    | "Recommended"
    | "Not contacted"
    | "Offer drafted"
    | "Contacted"
    | "Countered"
    | "Interested"
    | "Declined"
    | "Selected";
};

export type OperationsDemoState = {
  loads: DemoOperationsLoad[];
  attention: AttentionItem[];
  exceptions: DemoException[];
  communications: Communication[];
  timeline: TimelineEvent[];
  pricing: PricingState[];
  carriers: CarrierOption[];
  activity: string[];
};

const load = (
  id: string,
  number: string,
  customer: string,
  origin: string,
  destination: string,
  status: LoadStage,
  health: DemoOperationsLoad["health"],
  carrier: string,
  driver: string,
  tracking: DemoOperationsLoad["tracking"],
  eta: string,
  etaStatus: DemoOperationsLoad["etaStatus"],
  revenue: number,
  cost: number,
  progress: number,
  nextAction: string,
): DemoOperationsLoad => ({
  id,
  number,
  customer,
  origin,
  destination,
  pickup: "Jul 31 · 08:00–10:00",
  delivery: "Aug 1 · 09:00–11:00",
  status,
  health,
  carrier,
  driver,
  tracking,
  eta,
  etaStatus,
  revenue,
  carrierCost: cost,
  miles: 248,
  progress,
  currentLocation: progress > 0 ? "I-24 near Monteagle, TN" : origin,
  lastUpdate: tracking === "Live" ? "2 min ago" : "—",
  nextAction,
  owner: "Jordan Ellis",
});

export const initialOperationsDemoState: OperationsDemoState = {
  loads: [
    load(
      "atl-4821",
      "ATL-4821",
      "Hawthorne Home",
      "Nashville, TN",
      "Atlanta, GA",
      "In transit",
      "Healthy",
      "Summit Freight",
      "Luis Martinez",
      "Live",
      "Today · 15:42",
      "On time",
      4200,
      3320,
      64,
      "Monitor delivery ETA",
    ),
    load(
      "atl-4818",
      "ATL-4818",
      "Meridian Foods",
      "Chicago, IL",
      "Columbus, OH",
      "Pickup scheduled",
      "Watch",
      "BlueLine Logistics",
      "Tanya Brooks",
      "Not started",
      "Today · 18:10",
      "Pending",
      3650,
      2940,
      8,
      "Request driver tracking",
    ),
    load(
      "atl-4812",
      "ATL-4812",
      "Northstar Retail",
      "Dallas, TX",
      "Memphis, TN",
      "At risk",
      "At risk",
      "Redwood Transport",
      "Evan Cole",
      "Live",
      "Tomorrow · 10:34",
      "At risk",
      5100,
      4310,
      47,
      "Draft weather update",
    ),
    load(
      "atl-4809",
      "ATL-4809",
      "Apex Industrial",
      "Charlotte, NC",
      "Richmond, VA",
      "Delivered",
      "Complete",
      "Vector Carrier Co.",
      "Amir Khan",
      "Complete",
      "Delivered · 09:24",
      "Complete",
      2875,
      2200,
      100,
      "Collect proof of delivery",
    ),
    load(
      "atl-4825",
      "ATL-4825",
      "Keystone Paper",
      "Knoxville, TN",
      "Raleigh, NC",
      "Carrier assigned",
      "Healthy",
      "Cobalt Express",
      "Maya Reed",
      "Not started",
      "Tomorrow · 14:20",
      "Pending",
      3980,
      3150,
      0,
      "Confirm pickup appointment",
    ),
    load(
      "atl-4827",
      "ATL-4827",
      "Vela Consumer",
      "Savannah, GA",
      "Orlando, FL",
      "Sourcing carrier",
      "Watch",
      "Unassigned",
      "Unassigned",
      "Not started",
      "Pending",
      "Pending",
      3400,
      2700,
      0,
      "Select a carrier",
    ),
    load(
      "atl-4829",
      "ATL-4829",
      "Ironwood Supply",
      "Birmingham, AL",
      "Jacksonville, FL",
      "Ready to quote",
      "Healthy",
      "Unassigned",
      "Unassigned",
      "Not started",
      "Pending",
      "Pending",
      0,
      2480,
      0,
      "Review Atlas price",
    ),
    load(
      "atl-4830",
      "ATL-4830",
      "Solace Medical",
      "Louisville, KY",
      "Nashville, TN",
      "Awaiting customer approval",
      "Healthy",
      "Unassigned",
      "Unassigned",
      "Not started",
      "Pending",
      "Pending",
      3250,
      2510,
      0,
      "Customer quote expires in 3h",
    ),
    load(
      "atl-4831",
      "ATL-4831",
      "Crown Fixtures",
      "Atlanta, GA",
      "Tampa, FL",
      "Delayed",
      "Critical",
      "Oak River Freight",
      "DeShawn Price",
      "Paused",
      "Tomorrow · 12:40",
      "Late",
      4680,
      4010,
      35,
      "Resolve tracking loss",
    ),
    load(
      "atl-4833",
      "ATL-4833",
      "Juniper Foods",
      "Memphis, TN",
      "Little Rock, AR",
      "Documents pending",
      "Watch",
      "Pioneer Cartage",
      "Rose Nguyen",
      "Complete",
      "Delivered · 13:05",
      "Complete",
      2440,
      1900,
      100,
      "Request missing POD",
    ),
    load(
      "atl-4834",
      "ATL-4834",
      "Sterling Office",
      "Cincinnati, OH",
      "Detroit, MI",
      "Ready to invoice",
      "Complete",
      "Northline Trucking",
      "Caleb Wright",
      "Complete",
      "Delivered · Yesterday",
      "Complete",
      2980,
      2240,
      100,
      "Review invoice mismatch",
    ),
    load(
      "atl-4836",
      "ATL-4836",
      "Osprey Packaging",
      "Greenville, SC",
      "Nashville, TN",
      "Awaiting review",
      "Healthy",
      "Unassigned",
      "Unassigned",
      "Not started",
      "Pending",
      "Pending",
      0,
      2100,
      0,
      "Complete shipment review",
    ),
  ],
  attention: [
    {
      id: "att-1",
      loadId: "atl-4831",
      severity: "Critical",
      problem: "Driver tracking has been offline for 46 minutes",
      why: "The current ETA cannot be trusted and the customer update is overdue.",
      clock: "46 min overdue",
      recommendation:
        "Contact the driver, restore tracking, and draft a customer update.",
      owner: "Unassigned",
      status: "Open",
    },
    {
      id: "att-2",
      loadId: "atl-4818",
      severity: "High",
      problem: "Pickup approaches with tracking not started",
      why: "The driver is due at the facility within 54 minutes.",
      clock: "54 min remaining",
      recommendation:
        "Send the synthetic tracking request and confirm driver readiness.",
      owner: "Jordan Ellis",
      status: "Open",
    },
    {
      id: "att-3",
      loadId: "atl-4834",
      severity: "Medium",
      problem: "Carrier invoice is $185 above the rate confirmation",
      why: "The load cannot be reconciled or released for payment review.",
      clock: "2h overdue",
      recommendation:
        "Review the detention line item and request supporting documentation.",
      owner: "Maya Chen",
      status: "Open",
    },
  ],
  exceptions: [
    {
      id: "exc-1",
      loadId: "atl-4831",
      type: "Tracking lost",
      severity: "Critical",
      source: "Synthetic tracking monitor",
      detected: "46 min ago",
      evidence: "No location pings after driver departed Macon, GA.",
      impact: "ETA confidence reduced; customer update overdue.",
      playbook: [
        "Contact driver",
        "Restore tracking",
        "Recalculate ETA",
        "Notify customer",
      ],
      owner: "Unassigned",
      status: "Open",
      communication: "Needed",
    },
  ],
  communications: [
    {
      id: "com-1",
      loadId: "atl-4821",
      channel: "Automated update",
      title: "Pickup completed",
      body: "Load departed Atlas Nashville Warehouse on schedule.",
      time: "Today · 10:18",
      status: "Sent",
    },
    {
      id: "com-2",
      loadId: "atl-4821",
      channel: "Driver text",
      title: "Traffic moving normally",
      body: "Driver reports clear conditions approaching Monteagle.",
      time: "Today · 12:42",
      status: "Logged",
    },
    {
      id: "com-3",
      loadId: "atl-4821",
      channel: "Customer email",
      title: "Shipment on schedule",
      body: "Your shipment remains on track for the planned Atlanta delivery window.",
      time: "Today · 13:05",
      status: "Sent",
    },
  ],
  timeline: [
    {
      id: "tl-1",
      loadId: "atl-4821",
      title: "Driver tracking started",
      detail: "Synthetic location updates enabled by the operator.",
      time: "09:48",
      tone: "blue",
    },
    {
      id: "tl-2",
      loadId: "atl-4821",
      title: "Pickup completed",
      detail: "Driver departed Nashville at 10:18 AM.",
      time: "10:18",
      tone: "green",
    },
    {
      id: "tl-3",
      loadId: "atl-4821",
      title: "ETA recalculated",
      detail:
        "Estimated Atlanta arrival remains inside the appointment window.",
      time: "13:14",
      tone: "violet",
    },
  ],
  pricing: [
    {
      loadId: "atl-4829",
      marketCost: 2480,
      customerQuote: 3180,
      targetMargin: 20,
      riskBuffer: 150,
      confidence: 88,
      expires: "Today · 5:00 PM",
    },
    {
      loadId: "atl-4827",
      marketCost: 2700,
      customerQuote: 3400,
      targetMargin: 20,
      riskBuffer: 175,
      confidence: 91,
      expires: "Today · 6:30 PM",
    },
  ],
  carriers: [
    {
      id: "car-1",
      name: "Summit Freight",
      mc: "MC-1048XX",
      dot: "DOT-38XX21",
      rate: 2680,
      pickupDistance: 12,
      onTime: 97,
      tracking: 99,
      cancellations: 1.2,
      laneLoads: 18,
      insurance: "Verified",
      authority: "Active",
      relationship: "Preferred",
      fit: 96,
      stage: "Recommended",
    },
    {
      id: "car-2",
      name: "Cobalt Express",
      mc: "MC-7742XX",
      dot: "DOT-91XX05",
      rate: 2590,
      pickupDistance: 31,
      onTime: 94,
      tracking: 96,
      cancellations: 2.4,
      laneLoads: 11,
      insurance: "Verified",
      authority: "Active",
      relationship: "Good",
      fit: 91,
      stage: "Interested",
    },
    {
      id: "car-3",
      name: "Oak River Freight",
      mc: "MC-5521XX",
      dot: "DOT-47XX88",
      rate: 2480,
      pickupDistance: 46,
      onTime: 88,
      tracking: 82,
      cancellations: 5.8,
      laneLoads: 4,
      insurance: "Review",
      authority: "Active",
      relationship: "New",
      fit: 74,
      stage: "Countered",
    },
    {
      id: "car-4",
      name: "BlueLine Logistics",
      mc: "MC-3099XX",
      dot: "DOT-62XX17",
      rate: 2760,
      pickupDistance: 19,
      onTime: 96,
      tracking: 98,
      cancellations: 1.7,
      laneLoads: 15,
      insurance: "Verified",
      authority: "Active",
      relationship: "Preferred",
      fit: 94,
      stage: "Not contacted",
    },
  ],
  activity: [
    "POD received for ATL-4809",
    "Driver checked in for ATL-4818",
    "Weather risk detected for ATL-4812",
  ],
};

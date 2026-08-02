const actions: Record<string, (actor: string, subject: string) => string> = {
  TRACKING_UPDATE_RECORDED: (actor, subject) =>
    `${actor} recorded a tracking update for ${subject}.`,
  CARRIER_CANDIDATE_ENTERED: (actor, subject) =>
    `${actor} added a carrier option to ${subject}.`,
  CUSTOMER_CALL_RECORDED: (actor) => `${actor} recorded a customer call.`,
  QUOTE_CREATED: (actor, subject) =>
    `${actor} created a customer quote for ${subject}.`,
  QUOTE_APPROVED: (actor, subject) =>
    `${actor} approved the customer quote for ${subject}.`,
  CUSTOMER_ACCEPTANCE_RECORDED: (actor, subject) =>
    `${actor} recorded customer acceptance for ${subject}.`,
  CARRIER_SELECTED: (actor, subject) =>
    `${actor} selected the carrier for ${subject}.`,
  DRIVER_ASSIGNMENT_RECORDED: (actor, subject) =>
    `${actor} recorded driver and dispatch details for ${subject}.`,
  APPOINTMENT_CONFIRMED: (actor, subject) =>
    `${actor} confirmed an appointment for ${subject}.`,
  LOAD_OWNERSHIP_UPDATED: (actor, subject) =>
    `${actor} updated ownership and the next action for ${subject}.`,
  COMMUNICATION_LOGGED: (actor, subject) =>
    `${actor} recorded a communication for ${subject}.`,
  TASK_CREATED: (actor, subject) => `${actor} created a task for ${subject}.`,
  TASK_COMPLETED: (actor, subject) =>
    `${actor} completed a task for ${subject}.`,
  DRAFT_LOAD_CREATED: (actor, subject) =>
    `${actor} created ${subject} from an approved shipment.`,
  STOPS_CREATED: (actor, subject) =>
    `${actor} added pickup and delivery stops to ${subject}.`,
};

export function humanizeAuditActivity({
  action,
  actorName = "A team member",
  subject = "this record",
}: {
  action: string;
  actorName?: string;
  subject?: string;
}) {
  return (
    actions[action]?.(actorName, subject) ?? `${actorName} updated ${subject}.`
  );
}

export function humanizeCode(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}

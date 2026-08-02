export type Role = "OPERATOR" | "APPROVER" | "VIEWER";
export type Permission =
  | "shipment.create"
  | "shipment.review"
  | "shipment.approve"
  | "load.read"
  | "load.update"
  | "facility.read"
  | "facility.manage"
  | "route.calculate"
  | "quote.manage"
  | "quote.approve"
  | "carrier.manage"
  | "carrier.select"
  | "task.manage"
  | "membership.manage"
  | "audit.read";

const permissions: Record<Role, ReadonlySet<Permission>> = {
  OPERATOR: new Set([
    "shipment.create",
    "shipment.review",
    "load.read",
    "load.update",
    "facility.read",
    "facility.manage",
    "route.calculate",
    "carrier.manage",
    "task.manage",
    "audit.read",
  ]),
  APPROVER: new Set([
    "shipment.create",
    "shipment.review",
    "shipment.approve",
    "load.read",
    "load.update",
    "facility.read",
    "facility.manage",
    "route.calculate",
    "quote.manage",
    "quote.approve",
    "carrier.manage",
    "carrier.select",
    "task.manage",
    "membership.manage",
    "audit.read",
  ]),
  VIEWER: new Set(["load.read", "facility.read", "audit.read"]),
};

export function authorize(role: Role, permission: Permission): void {
  if (!permissions[role].has(permission)) throw new Error("FORBIDDEN");
}

export function authorizeAny(
  roles: readonly Role[],
  permission: Permission,
): void {
  if (!roles.some((role) => permissions[role].has(permission))) {
    throw new Error("FORBIDDEN");
  }
}

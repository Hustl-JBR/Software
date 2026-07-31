export type Role = "OPERATOR" | "APPROVER" | "VIEWER";
export type Permission =
  | "shipment.create"
  | "shipment.review"
  | "shipment.approve"
  | "load.read"
  | "audit.read";

const permissions: Record<Role, ReadonlySet<Permission>> = {
  OPERATOR: new Set([
    "shipment.create",
    "shipment.review",
    "load.read",
    "audit.read",
  ]),
  APPROVER: new Set([
    "shipment.create",
    "shipment.review",
    "shipment.approve",
    "load.read",
    "audit.read",
  ]),
  VIEWER: new Set(["load.read", "audit.read"]),
};

export function authorize(role: Role, permission: Permission): void {
  if (!permissions[role].has(permission)) throw new Error("FORBIDDEN");
}

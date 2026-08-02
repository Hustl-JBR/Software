import { ZodError } from "zod";

const safeCodes = new Map<string, string>([
  ["FORBIDDEN", "unauthorized"],
  ["NOT_FOUND", "not-found"],
  ["STALE_REVISION", "stale-revision"],
  ["REVISION_ALREADY_APPROVED", "duplicate-approval"],
  ["ALREADY_APPROVED", "duplicate-approval"],
  ["IDEMPOTENCY_KEY_REUSED", "idempotency"],
  ["INVALID_IDEMPOTENCY_KEY", "idempotency"],
  ["APPROVAL_IN_PROGRESS", "idempotency"],
  ["SEPARATION_OF_DUTIES", "separation-of-duties"],
  ["INVALID_STATE", "invalid-state"],
  ["STATUS_CONFLICT", "status-conflict"],
  ["CARRIER_BLOCKED", "carrier-blocked"],
  ["CARRIER_ALREADY_SELECTED", "carrier-already-selected"],
  ["CARRIER_NOT_SELECTED", "carrier-not-selected"],
  ["INVALID_MONEY", "invalid-money"],
]);

export function safeErrorCode(error: unknown): string {
  if (error instanceof ZodError) return "invalid-form";
  const message = error instanceof Error ? error.message : "";
  const exact = safeCodes.get(message);
  if (exact) return exact;
  if (message.startsWith("INVALID_REVISION")) return "invalid-revision";
  return "database";
}

export function safeReturnPath(slug: string, requested: string): string {
  if (requested === "/internal/staging-tools") return requested;
  if (requested === "/operations") return requested;
  const loadPath = new RegExp(
    `^/org/${escapeRegExp(slug)}/loads/[0-9a-f-]+$`,
    "i",
  );
  return loadPath.test(requested) ? requested : "/operations";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

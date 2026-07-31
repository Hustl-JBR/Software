const messages: Record<string, string> = {
  "invalid-form": "Review the submitted values and try again.",
  "invalid-revision":
    "This revision is incomplete or invalid. Correct the highlighted shipment facts before approval.",
  "stale-revision":
    "A newer correction exists. Review and approve the latest revision instead.",
  unauthorized: "Your role does not permit that action.",
  "not-found": "That record is unavailable or belongs to another organization.",
  "duplicate-approval":
    "This shipment request was already approved. Return to the dashboard to open its draft load.",
  idempotency:
    "This approval request is invalid, already in progress, or reused for different data. Refresh before retrying.",
  database:
    "Atlas could not save the change. No partial approval was created. Try again or contact an administrator.",
};

export function ErrorAlert({ code }: { code?: string }) {
  if (!code) return null;
  return (
    <div className="alert error" role="alert">
      {messages[code] ?? messages.database}
    </div>
  );
}

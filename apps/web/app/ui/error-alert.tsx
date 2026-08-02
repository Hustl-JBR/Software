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
  "separation-of-duties":
    "A quote must be approved by someone other than its creator.",
  "invalid-state":
    "That action is not available at the record's current stage.",
  "status-conflict":
    "That update conflicts with the load's current operational status.",
  "carrier-blocked":
    "This carrier option does not meet the recorded qualification requirements.",
  "carrier-already-selected":
    "Another carrier is already selected for this load.",
  "carrier-not-selected":
    "Select an eligible carrier before assigning its driver.",
  "invalid-money":
    "Enter a valid non-negative dollar amount, such as $2,850.00.",
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

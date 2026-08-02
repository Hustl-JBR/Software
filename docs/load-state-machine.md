# Load status state machine

## Principles

Load status describes operational execution, not quote, approval, compliance, invoice, or payment status; those use separate state machines. Every transition is a server-side command with authorization, validation, expected aggregate version, idempotency key, reason where required, and an audit/status-transition row in the same transaction.

## States

| State               | Meaning                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `DRAFT`             | Reviewed shipment facts are being prepared; not commercially committed.                     |
| `QUOTED`            | An approved quote was sent; awaiting customer decision.                                     |
| `CUSTOMER_ACCEPTED` | Customer acceptance evidence is recorded; capacity is not yet booked.                       |
| `COVERED`           | A human-approved carrier booking and acceptance evidence exist.                             |
| `DISPATCHED`        | Dispatch details/rate confirmation were approved and sent; carrier is preparing for pickup. |
| `AT_PICKUP`         | Arrival at the first incomplete pickup is recorded.                                         |
| `IN_TRANSIT`        | Pickup/departure evidence indicates freight is moving.                                      |
| `AT_DELIVERY`       | Arrival at the final delivery is recorded.                                                  |
| `DELIVERED`         | Delivery is reported, but required completion evidence may remain.                          |
| `COMPLETED`         | Required milestones/documents and operational review are complete.                          |
| `CANCELLED`         | Work stopped before completion with reason and attribution. Terminal operational state.     |

An **exception is not a load state**. Open exceptions, holds, late risk, claims, and document/financial status are orthogonal flags/workflows so operational truth is not lost.

## Normal transitions and guards

| From -> To                     | Command                 | Minimum guard                                                                                                                  |
| ------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `DRAFT -> QUOTED`              | Record quote sent       | Approved, current, unexpired quote; human-approved communication; recipient and sent evidence.                                 |
| `QUOTED -> CUSTOMER_ACCEPTED`  | Record acceptance       | Verifiable customer acceptance of exact quote revision.                                                                        |
| `CUSTOMER_ACCEPTED -> COVERED` | Confirm booking         | Active compliance checks meet policy; carrier/offer selected; human approval; agreed cost and acceptance evidence.             |
| `COVERED -> DISPATCHED`        | Dispatch load           | Human-approved rate confirmation; required dispatch details complete; send succeeds or documented manual-send evidence exists. |
| `DISPATCHED -> AT_PICKUP`      | Record pickup arrival   | Event time/source and relevant stop; no later incompatible milestone.                                                          |
| `AT_PICKUP -> IN_TRANSIT`      | Record pickup departure | Pickup completion event; required pickup exceptions acknowledged.                                                              |
| `IN_TRANSIT -> AT_DELIVERY`    | Record delivery arrival | Final delivery stop arrival evidence.                                                                                          |
| `AT_DELIVERY -> DELIVERED`     | Record delivery         | Delivery completion time/source; shortage/damage noted as exceptions, never silently resolved.                                 |
| `DELIVERED -> COMPLETED`       | Complete operations     | Required POD/document policy met or approved exception; operational exceptions dispositioned.                                  |
| nonterminal `-> CANCELLED`     | Cancel load             | Authorized human, reason code/free-text, customer/carrier attribution, and downstream notification/charge tasks generated.     |

Multi-stop loads repeat arrival/departure milestones per stop while the summarized load state remains `IN_TRANSIT` between the first pickup departure and final delivery arrival.

## Corrections and exceptional paths

- Do not delete or rewrite milestone history. Append a correction referencing the erroneous event and recompute the projection.
- A mistaken transition uses an explicit privileged `CORRECT_STATUS` command with reason and audit evidence; it is not a general backward transition.
- Reopening `COMPLETED` requires manager approval and creates an exception plus a new transition; `CANCELLED` is not reopened—create/link a replacement load unless policy later specifies otherwise.
- Suspected lateness creates/updates an exception from expected-versus-observed milestones; it never fabricates a tracking event.
- Duplicate/out-of-order vendor events are stored/deduplicated and may be marked non-state-changing rather than forcing invalid transitions.

## Related state machines to define during implementation

- Intake: `RECEIVED -> PARSED -> NEEDS_REVIEW -> APPROVED/REJECTED`.
- Quote revision: `DRAFT -> PENDING_APPROVAL -> APPROVED -> SENT -> ACCEPTED/DECLINED/EXPIRED/SUPERSEDED`.
- Approval: `PENDING -> APPROVED/REJECTED/EXPIRED/CANCELLED`.
- Document: `UPLOADED -> SCANNING -> AVAILABLE/QUARANTINED -> EXTRACTED -> REVIEWED`.
- Invoice/bill: draft, approval, issued/approved, settled/void states defined independently.

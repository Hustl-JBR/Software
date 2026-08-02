# Status consistency

Atlas currently has one authoritative load status: `DRAFT`. Readiness blockers, tasks, tracking evidence, and exceptions are separate facts; they do not silently rewrite that status. An exception may coexist with a later physical position, but it must not erase it.

While a load is DRAFT, physical tracking milestones (`AT_PICKUP`, `IN_TRANSIT`, `AT_DELIVERY`, `DELIVERED`) are rejected server-side with a safe status-conflict result. Manual check calls and non-physical exceptions remain recordable, and the load screen explains the block.

Migration `20260802000200_status_consistency` repairs only synthetic contradictions: physical tracking rows attached to DRAFT loads become `MANUAL_CHECK_CALL` and retain an explanatory note. This is a forward, reviewed data repair; no Railway row should be edited manually.

Future lifecycle work should add only evidence-backed transitions with invariants, actor/reason, idempotency, and history. It must distinguish position from exception and avoid a sprawling status enum.
